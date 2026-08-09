import { VIDEO_EXTENSIONS } from "@seedarr/shared";
import { eq } from "drizzle-orm";
import type { StreamingApi } from "hono/utils/stream";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";
import { createCache } from "@/shared/helpers/cache.helper";
import { logger } from "@/shared/helpers/logger.helper";
import { resolveWithinDownloads } from "@/shared/helpers/path.helper";
import { pipeNodeStream } from "@/shared/helpers/stream.helper";
import {
  convertToFragmentedMp4Stream,
  getVideoInputFormat,
  probeVideoStreams,
  type RemuxInput,
} from "@/shared/helpers/video.helper";
import { findLargestVideoInDirectory } from "@/shared/helpers/video-file.helper";

import { db } from "@/db/db";
import type { Download, TorrentLiveData } from "@/modules/download/download.schema";
import { download as downloadTable } from "@/modules/download/download.schema";
import { findLargestVideoFile } from "@/modules/download/webtorrent/webtorrent.helper";
import { torrentClient } from "@/modules/download/webtorrent/webtorrent-manager";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import * as path from "node:path";
import {
  type ByteRange,
  buildStreamHeaders,
  isFsNotFoundError,
  parseRangeHeader,
  resolveRemoteVideoInfo,
} from "./streaming.helper";
import { acquireStreamLease } from "./streaming-lease";

/** Resolved source metadata — cacheable (no open streams/handles). */
export interface StreamSourceInfo {
  size: number;
  fileName: string;
  filePath?: string;
  remotePath?: string;
  isRemote?: boolean;
  hasTorrentFile?: boolean;
}

type PlaybackMode = "direct" | "live";

export interface PlaybackInfo {
  mode: PlaybackMode;
  duration: number | null;
  seekable: boolean;
  origin: "local" | "remote" | "torrent";
}

export interface DirectStreamResult {
  status: 200 | 206 | 416;
  headers: Record<string, string>;
  pipe?: (honoStream: StreamingApi) => Promise<void>;
}

export interface LiveStreamResult {
  headers: Record<string, string>;
  pipe: (honoStream: StreamingApi) => Promise<void>;
}

const sourceCache = createCache<StreamSourceInfo>({
  max: 100,
  ttl: 5 * 60_000,
  name: "stream-source",
});

export function invalidateStreamSource(downloadId: string): void {
  sourceCache.delete(downloadId);
}

export class StreamingService {
  async resolveSourceInfo(download: Download): Promise<StreamSourceInfo | undefined> {
    const cached = sourceCache.get(download.id);
    if (cached) return cached;

    const info = await this.computeSourceInfo(download);
    if (info) sourceCache.set(download.id, info);
    return info;
  }

  async getPlaybackInfo(download: Download): Promise<PlaybackInfo> {
    const source = await this.resolveSourceInfo(download);
    if (!source) throw new NotFoundError("Video file");

    const origin: PlaybackInfo["origin"] = source.isRemote ? "remote" : source.filePath ? "local" : "torrent";
    const canDirect = Boolean(source.filePath || source.remotePath || source.hasTorrentFile);
    const mode: PlaybackMode = canDirect ? "direct" : "live";
    const duration = await this.resolveDuration(download, source);

    logger.info("STREAM", `playback info ${download.id}: mode=${mode} origin=${origin} file=${source.fileName}`);

    return { mode, duration, seekable: mode === "direct", origin };
  }

  async prepareDirectStream(download: Download, rangeHeader: string | undefined): Promise<DirectStreamResult> {
    const source = await this.resolveSourceInfo(download);
    if (!source) throw new NotFoundError("Video file");
    if (!source.filePath && !source.remotePath && !source.hasTorrentFile) {
      throw new BadRequestError("Direct streaming requires a seekable source");
    }

    const range = parseRangeHeader(rangeHeader, source.size);
    if (range === "unsatisfiable") {
      return { status: 416, headers: { "Content-Range": `bytes */${source.size}` } };
    }

    logger.debug(
      "STREAM",
      `direct ${download.id}: ${range ? `${range.start}-${range.end}` : "full"} ${source.fileName}`,
    );

    return {
      status: range ? 206 : 200,
      headers: buildStreamHeaders(source.fileName, source.size, range),
      pipe: (honoStream) => this.pipeSource(download, source, range, honoStream),
    };
  }

  async prepareLiveStream(download: Download): Promise<LiveStreamResult> {
    const source = await this.resolveSourceInfo(download);
    if (!source) throw new NotFoundError("Video file");

    logger.info("STREAM", `live remux ${download.id}: file=${source.fileName}`);
    const headers: Record<string, string> = { "Content-Type": "video/mp4" };
    if (download.torrent?.durationSeconds) headers["X-Video-Duration"] = String(download.torrent.durationSeconds);

    return {
      headers,
      pipe: (honoStream) => this.pipeLiveSource(download, source, honoStream),
    };
  }

  // --- Private: source resolution ---

  private async computeSourceInfo(download: Download): Promise<StreamSourceInfo | undefined> {
    if (download.remoteLocation) {
      const remote = await this.tryRemoteSource(download);
      if (remote) return remote;
    }

    if (download.torrent?.done) {
      const fromDisk = await this.resolveFromDisk(download);
      if (fromDisk) return fromDisk;
    }

    const activeTorrent = torrentClient.getActiveTorrent(download.id);
    if (activeTorrent) {
      const videoFile = findLargestVideoFile(activeTorrent);
      if (!videoFile) return undefined;
      return { size: videoFile.length, fileName: videoFile.name, hasTorrentFile: true };
    }

    return this.resolveFromDisk(download);
  }

  private async tryRemoteSource(item: Download): Promise<StreamSourceInfo | undefined> {
    if (!item.remoteLocation) return undefined;
    try {
      const info = await resolveRemoteVideoInfo(item, item.remoteLocation);
      if (!info) return undefined;
      return { size: info.size, fileName: info.fileName, remotePath: info.remotePath, isRemote: true };
    } catch (error) {
      logger.warn("STREAM", `Remote source resolve failed: ${error}`);
      return undefined;
    }
  }

  private async resolveFromDisk(download: Download): Promise<StreamSourceInfo | undefined> {
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "");
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isFile()) {
        const fileName = path.basename(fullPath);
        return VIDEO_EXTENSIONS.test(fileName) ? { size: stats.size, fileName, filePath: fullPath } : undefined;
      }
      const largest = await findLargestVideoInDirectory(fullPath);
      return largest ? { size: largest.size, fileName: largest.fileName, filePath: largest.filePath } : undefined;
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      if (isFsNotFoundError(error)) return undefined;
      throw error;
    }
  }

  // --- Private: streaming ---

  private async pipeSource(
    download: Download,
    source: StreamSourceInfo,
    range: ByteRange | undefined,
    honoStream: StreamingApi,
  ): Promise<void> {
    const releaseLease = acquireStreamLease(download.id);
    const cleanups: Array<() => void> = [];
    honoStream.onAbort(() => {
      for (const fn of cleanups) fn();
      releaseLease();
    });

    try {
      const input = await this.openInput(download, source, range, cleanups);
      if (!input) throw new NotFoundError("Stream source unavailable");
      await pipeNodeStream(honoStream, input);
    } finally {
      releaseLease();
    }
  }

  private async pipeLiveSource(download: Download, source: StreamSourceInfo, honoStream: StreamingApi): Promise<void> {
    const releaseLease = acquireStreamLease(download.id);
    const cleanups: Array<() => void> = [];
    honoStream.onAbort(() => {
      for (const fn of cleanups) fn();
      releaseLease();
    });

    try {
      let remuxInput: RemuxInput;
      if (source.filePath) {
        remuxInput = { filePath: source.filePath };
      } else {
        const input = await this.openInput(download, source, undefined, cleanups);
        if (!input) throw new NotFoundError("Stream source unavailable");
        remuxInput = { stream: input };
      }

      const remuxed = convertToFragmentedMp4Stream(remuxInput, {
        inputFormat: getVideoInputFormat(source.fileName),
        video: "copy",
        audio: "aac",
      });
      cleanups.push(remuxed.destroy);
      await pipeNodeStream(honoStream, remuxed.stream);
    } finally {
      releaseLease();
    }
  }

  private async openInput(
    download: Download,
    source: StreamSourceInfo,
    range: ByteRange | undefined,
    cleanups: Array<() => void>,
  ): Promise<NodeJS.ReadableStream | undefined> {
    if (source.isRemote && source.remotePath) {
      try {
        const remote = await remoteStorageService.createReadStream(source.remotePath, range);
        if (!remote) return undefined;
        if (remote.cleanup) cleanups.push(remote.cleanup);
        return remote.stream;
      } catch (error) {
        logger.warn("STREAM", `Remote read failed: ${error}`);
        return undefined;
      }
    }

    const opened = this.openLocalStream(download, source, range);
    cleanups.push(() => {
      if ("destroy" in opened && typeof opened.destroy === "function") opened.destroy();
    });
    return opened;
  }

  private openLocalStream(download: Download, source: StreamSourceInfo, range?: ByteRange): NodeJS.ReadableStream {
    if (source.hasTorrentFile) {
      const activeTorrent = torrentClient.getActiveTorrent(download.id);
      if (activeTorrent) {
        const videoFile = findLargestVideoFile(activeTorrent);
        if (videoFile) {
          return range ? videoFile.createReadStream(range) : videoFile.createReadStream();
        }
      }
    }
    if (source.filePath) {
      return range ? fsSync.createReadStream(source.filePath, range) : fsSync.createReadStream(source.filePath);
    }
    throw new Error("No local stream source available");
  }

  // --- Private: duration ---

  private async resolveDuration(download: Download, source: StreamSourceInfo): Promise<number | null> {
    const cached = download.torrent?.durationSeconds;
    if (cached != null && cached > 0) return cached;

    if (!source.filePath) return null;

    const probe = await probeVideoStreams({ filePath: source.filePath });
    if (probe?.duration) {
      await this.cacheDuration(download.id, download.torrent, probe.duration);
      return probe.duration;
    }
    return null;
  }

  private async cacheDuration(
    downloadId: string,
    torrent: TorrentLiveData | null | undefined,
    durationSeconds: number,
  ): Promise<void> {
    if (!torrent) return;
    await db
      .update(downloadTable)
      .set({ torrent: { ...torrent, durationSeconds } })
      .where(eq(downloadTable.id, downloadId));
  }
}
