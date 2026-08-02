import { VIDEO_EXTENSIONS } from "@seedarr/shared";
import { eq } from "drizzle-orm";
import type { StreamingApi } from "hono/utils/stream";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { assertWithinDownloads, resolveWithinDownloads } from "@/helpers/path.helper";
import { pipeNodeStream } from "@/helpers/stream.helper";
import {
  convertToFragmentedMp4Stream,
  getVideoInputFormat,
  probeVideoStreams,
  type RemuxInput,
  type VideoProbe,
} from "@/helpers/video.helper";
import type { Download } from "@/modules/download/download.dto";
import type { TorrentLiveData } from "@/modules/download/download.schema";
import { download as downloadTable } from "@/modules/download/download.schema";
import { findLargestVideoFile } from "@/modules/download/webtorrent.helper";
import { torrentClient } from "@/modules/download/webtorrent-manager";
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

export interface StreamSource {
  size: number;
  fileName: string;
  stream?: NodeJS.ReadableStream;
  filePath?: string;
  remotePath?: string;
  torrentFile?: WebTorrent.TorrentFile;
  cleanup?: () => void;
  isRemote?: boolean;
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
  /** Absent when status=416 (nothing to pipe). */
  pipe?: (honoStream: StreamingApi) => Promise<void>;
}

export interface LiveStreamResult {
  headers: Record<string, string>;
  pipe: (honoStream: StreamingApi) => Promise<void>;
}

export class StreamingService {
  async resolveSource(download: Download): Promise<StreamSource | undefined> {
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
      return {
        stream: videoFile.createReadStream(),
        size: videoFile.length,
        fileName: videoFile.name,
        torrentFile: videoFile,
      };
    }

    return this.resolveFromDisk(download);
  }

  async getPlaybackInfo(download: Download): Promise<PlaybackInfo> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const origin: PlaybackInfo["origin"] = source.isRemote ? "remote" : source.filePath ? "local" : "torrent";
    // Prefer byte-range direct whenever we have a seekable handle (disk, remote, or active torrent file).
    const canDirect = Boolean(source.filePath || source.remotePath || source.torrentFile);
    const mode: PlaybackMode = canDirect ? "direct" : "live";
    const duration = await this.resolveDuration(download, source);

    logger.info("STREAM", `playback info ${download.id}: mode=${mode} origin=${origin} file=${source.fileName}`);

    return {
      mode,
      duration,
      seekable: mode === "direct",
      origin,
    };
  }

  /** Prepare headers + pipe closure for byte-range direct streaming. */
  async prepareDirectStream(download: Download, rangeHeader: string | undefined): Promise<DirectStreamResult> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");
    if (!source.filePath && !source.remotePath && !source.torrentFile) {
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
      pipe: (honoStream) => this.pipeSource(download.id, source, range, honoStream),
    };
  }

  /** Live fMP4 remux for sources without a seekable handle (fallback while downloading). */
  async prepareLiveStream(download: Download): Promise<LiveStreamResult> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    logger.info("STREAM", `live remux ${download.id}: file=${source.fileName}`);
    const headers: Record<string, string> = { "Content-Type": "video/mp4" };
    if (download.torrent?.durationSeconds) headers["X-Video-Duration"] = String(download.torrent.durationSeconds);

    return {
      headers,
      pipe: (honoStream) => this.pipeLiveSource(download.id, source, honoStream),
    };
  }

  private async pipeSource(
    downloadId: string,
    source: StreamSource,
    range: ByteRange | undefined,
    honoStream: StreamingApi,
  ): Promise<void> {
    const releaseLease = acquireStreamLease(downloadId);
    const cleanups: Array<() => void> = [];
    honoStream.onAbort(() => {
      for (const fn of cleanups) fn();
      releaseLease();
    });

    try {
      const input = await this.openInput(source, range, cleanups);
      if (!input) throw new NotFoundError("Stream source unavailable");
      await pipeNodeStream(honoStream, input);
    } finally {
      releaseLease();
    }
  }

  private async pipeLiveSource(downloadId: string, source: StreamSource, honoStream: StreamingApi): Promise<void> {
    const releaseLease = acquireStreamLease(downloadId);
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
        const input = await this.openInput(source, undefined, cleanups);
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
    source: StreamSource,
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

    const opened = this.openLocalStream(source, range);
    cleanups.push(() => {
      if ("destroy" in opened && typeof opened.destroy === "function") opened.destroy();
    });
    if (source.cleanup) cleanups.push(source.cleanup);
    return opened;
  }

  private openLocalStream(source: StreamSource, range?: ByteRange): NodeJS.ReadableStream {
    if (source.torrentFile) {
      return range ? source.torrentFile.createReadStream(range) : source.torrentFile.createReadStream();
    }
    if (source.filePath) {
      return range ? fsSync.createReadStream(source.filePath, range) : fsSync.createReadStream(source.filePath);
    }
    if (source.stream) return source.stream;
    throw new Error("No local stream source available");
  }

  private async resolveDuration(download: Download, source: StreamSource): Promise<number | null> {
    const cached = download.torrent?.durationSeconds;
    if (cached != null && cached > 0) return cached;

    let probe: VideoProbe | null = null;
    if (source.filePath) {
      probe = await probeVideoStreams({ filePath: source.filePath });
    } else if (source.remotePath) {
      try {
        const remote = await remoteStorageService.createReadStream(source.remotePath);
        if (remote) {
          probe = await probeVideoStreams({ stream: remote.stream });
          remote.cleanup?.();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn("STREAM", `Remote probe failed for ${download.id}: ${message}`);
      }
    }

    if (probe?.duration) {
      await this.cacheDuration(download.id, download.torrent, probe.duration);
      return probe.duration;
    }
    return null;
  }

  private async tryRemoteSource(item: Download): Promise<StreamSource | undefined> {
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

  private async resolveFromDisk(download: Download): Promise<StreamSource | undefined> {
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "");
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isFile()) {
        const fileName = path.basename(fullPath);
        return VIDEO_EXTENSIONS.test(fileName) ? { size: stats.size, fileName, filePath: fullPath } : undefined;
      }
      return await this.findLargestVideoInFolder(fullPath);
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      if (isFsNotFoundError(error)) return undefined;
      throw error;
    }
  }

  private async findLargestVideoInFolder(fullPath: string): Promise<StreamSource | undefined> {
    const files = await fs.readdir(fullPath, { recursive: true, withFileTypes: true });
    const videoFiles = await Promise.all(
      files
        .filter((file) => file.isFile() && VIDEO_EXTENSIONS.test(file.name))
        .map(async (file) => {
          const filePath = path.join(file.parentPath || fullPath, file.name);
          assertWithinDownloads(filePath);
          const fileStats = await fs.stat(filePath);
          return { path: filePath, name: file.name, size: fileStats.size };
        }),
    );
    if (videoFiles.length === 0) return undefined;
    const largest = videoFiles.sort((a, b) => b.size - a.size)[0];
    return { size: largest.size, fileName: largest.name, filePath: largest.path };
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
