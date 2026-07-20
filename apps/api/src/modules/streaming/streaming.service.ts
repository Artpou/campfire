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
  probeVideoDuration,
  shouldTranscodeForPlayback,
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
  buildRemoteVideoInfo,
  buildStreamHeaders,
  isFsNotFoundError,
  parseRangeHeader,
  VIDEO_EXTENSIONS,
} from "./streaming.helper";
import {
  buildHlsPlaylist,
  generateSegment,
  generateSegmentFromStream,
  getOrCreateSession,
} from "./streaming-hls.service";
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

type PlaybackMode = "hls" | "direct" | "live";

export interface PlaybackInfo {
  mode: PlaybackMode;
  duration: number | null;
  seekable: boolean;
  origin: "local" | "remote" | "torrent";
}

export interface DownloadFilePayload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  size: number;
}

export class StreamingService {
  async resolveSource(download: Download): Promise<StreamSource | undefined> {
    if (download.remoteLocation) {
      const remote = this.tryRemoteSource(download);
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

    const needsRemux = shouldTranscodeForPlayback(source.fileName);
    const origin: PlaybackInfo["origin"] = source.isRemote ? "remote" : source.filePath ? "local" : "torrent";

    const hasFile = Boolean(source.filePath || source.remotePath);
    const mode: PlaybackMode = needsRemux ? (hasFile ? "hls" : "live") : "direct";
    const seekable = mode === "hls" || mode === "direct";

    const cached = download.torrent?.durationSeconds;
    if (cached != null && cached > 0) return { mode, duration: cached, seekable, origin };

    const duration = await this.probeSourceDuration(source);
    if (duration != null) await this.cacheDuration(download.id, download.torrent, duration);

    return { mode, duration: duration ?? null, seekable, origin };
  }

  async getHlsPlaylist(download: Download): Promise<string> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");
    if (!source.filePath && !source.remotePath) throw new BadRequestError("HLS requires a complete file");

    const duration = download.torrent?.durationSeconds ?? (await this.probeSourceDuration(source));
    if (!duration || duration <= 0) throw new BadRequestError("Cannot determine video duration for HLS");

    const inputPath = source.filePath ?? "";
    if (!inputPath) throw new BadRequestError("HLS from remote not yet supported — file must be local");

    const session = await getOrCreateSession(download.id, inputPath, duration);
    return buildHlsPlaylist(session.duration, session.segmentCount);
  }

  async getHlsSegment(download: Download, index: number): Promise<Buffer> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const duration = download.torrent?.durationSeconds ?? (await this.probeSourceDuration(source));
    if (!duration || duration <= 0) throw new NotFoundError("Video duration unavailable");

    if (source.filePath) {
      const session = await getOrCreateSession(download.id, source.filePath, duration);
      if (index < 0 || index >= session.segmentCount) throw new NotFoundError("Segment out of range");
      return generateSegment(session, index);
    }

    if (source.remotePath) {
      const remote = await remoteStorageService.createReadStream(source.remotePath);
      if (!remote) throw new NotFoundError("Remote file unavailable");
      try {
        return await generateSegmentFromStream(remote.stream, getVideoInputFormat(source.fileName));
      } finally {
        remote.cleanup?.();
      }
    }

    throw new BadRequestError("HLS requires a seekable source");
  }

  async pipeDirectStream(
    download: Download,
    rangeHeader: string | undefined,
    honoStream: StreamingApi,
  ): Promise<{ status: 200 | 206 | 416; headers: Record<string, string> }> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const range = parseRangeHeader(rangeHeader, source.size);
    if (range === "unsatisfiable") {
      return { status: 416, headers: { "Content-Range": `bytes */${source.size}` } };
    }

    const headers = buildStreamHeaders(source.fileName, source.size, range);
    const releaseLease = acquireStreamLease(download.id);
    const cleanups: Array<() => void> = [];

    honoStream.onAbort(() => {
      for (const fn of cleanups) fn();
      releaseLease();
    });

    try {
      const input = await this.openInput(source, range, cleanups);
      if (!input) {
        releaseLease();
        throw new NotFoundError("Stream source unavailable");
      }
      await pipeNodeStream(honoStream, input);
    } finally {
      releaseLease();
    }

    return { status: range ? 206 : 200, headers };
  }

  async pipeLiveStream(download: Download, honoStream: StreamingApi): Promise<Record<string, string>> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const releaseLease = acquireStreamLease(download.id);
    const cleanups: Array<() => void> = [];

    honoStream.onAbort(() => {
      for (const fn of cleanups) fn();
      releaseLease();
    });

    try {
      const input = await this.openInput(source, undefined, cleanups);
      if (!input) {
        releaseLease();
        throw new NotFoundError("Stream source unavailable");
      }

      const remuxInput = source.filePath ? { filePath: source.filePath } : { stream: input };
      if (source.filePath && "destroy" in input && typeof input.destroy === "function") input.destroy();

      const transcoded = convertToFragmentedMp4Stream(remuxInput, {
        inputFormat: getVideoInputFormat(source.fileName),
      });
      cleanups.push(transcoded.destroy);
      await pipeNodeStream(honoStream, transcoded.stream);
    } finally {
      releaseLease();
    }

    const headers: Record<string, string> = { "Content-Type": "video/mp4" };
    const duration = download.torrent?.durationSeconds;
    if (duration != null) headers["X-Video-Duration"] = String(duration);
    return headers;
  }

  getFile(download: Download, rawFilePath: string): DownloadFilePayload {
    const filePath = decodeURIComponent(rawFilePath);
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);
    if (!fsSync.existsSync(fullPath)) throw new NotFoundError("File");

    const contentType = filePath.endsWith(".srt")
      ? "text/plain; charset=utf-8"
      : filePath.endsWith(".vtt")
        ? "text/vtt; charset=utf-8"
        : "application/octet-stream";

    const stats = fsSync.statSync(fullPath);
    return { stream: fsSync.createReadStream(fullPath), contentType, size: stats.size };
  }

  // --- Private ---

  private tryRemoteSource(item: Download): StreamSource | undefined {
    if (!item.remoteLocation) return undefined;
    const info = buildRemoteVideoInfo(item, item.remoteLocation);
    if (!info) return undefined;
    return { size: info.size, fileName: info.fileName, remotePath: info.remotePath, isRemote: true };
  }

  private async openInput(
    source: StreamSource,
    range: ByteRange | undefined,
    cleanups: Array<() => void>,
  ): Promise<NodeJS.ReadableStream | undefined> {
    if (source.isRemote) {
      if (!source.remotePath) return undefined;
      try {
        const remote = await remoteStorageService.createReadStream(source.remotePath, range);
        if (!remote) throw new Error("Remote stream unavailable");
        if (remote.cleanup) cleanups.push(remote.cleanup);
        return remote.stream;
      } catch (error) {
        logger.warn("STREAM", `Remote playback failed, falling back to local: ${error}`);
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

  private async probeSourceDuration(source: StreamSource): Promise<number | undefined> {
    if (source.filePath) return probeVideoDuration({ filePath: source.filePath });

    if (source.remotePath) {
      try {
        const remote = await remoteStorageService.createReadStream(source.remotePath);
        if (!remote) return undefined;
        try {
          return await probeVideoDuration({ stream: remote.stream });
        } finally {
          remote.cleanup?.();
          if ("destroy" in remote.stream && typeof remote.stream.destroy === "function") {
            (remote.stream as NodeJS.ReadableStream & { destroy: () => void }).destroy();
          }
        }
      } catch (error) {
        logger.warn("STREAM", `Remote duration probe failed: ${error}`);
        return undefined;
      }
    }

    return undefined;
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
}
