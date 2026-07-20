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
  hasMoovAtStart,
  type PlaybackPlan,
  probeVideoStreams,
  type RemuxInput,
  resolvePlaybackPlan,
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
  buildRemoteVideoInfo,
  buildStreamHeaders,
  isFsNotFoundError,
  parseRangeHeader,
  VIDEO_EXTENSIONS,
} from "./streaming.helper";
import { buildHlsPlaylist, generateSegment, getOrCreateSession } from "./streaming-hls.service";
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
  videoCodec: string | null;
  audioCodec: string | null;
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

export interface DownloadFilePayload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  size: number;
}

export class StreamingService {
  // ── Source resolution ──────────────────────────────────────────────

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

  // ── Public API ─────────────────────────────────────────────────────

  async getPlaybackInfo(download: Download): Promise<PlaybackInfo> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const origin: PlaybackInfo["origin"] = source.isRemote ? "remote" : source.filePath ? "local" : "torrent";
    const hasCompleteFile = Boolean(source.filePath || source.remotePath);
    const { probe, plan } = await this.resolvePlan(download, source, hasCompleteFile);

    return {
      mode: plan.mode,
      duration: probe?.duration ?? download.torrent?.durationSeconds ?? null,
      seekable: plan.mode !== "live",
      origin,
      videoCodec: probe?.videoCodec ?? download.torrent?.videoCodec ?? null,
      audioCodec: probe?.audioCodec ?? download.torrent?.audioCodec ?? null,
    };
  }

  async getHlsPlaylist(download: Download): Promise<string> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const input = await this.resolveHlsInput(source);
    if (!input) throw new BadRequestError("HLS requires a seekable source (local file or remote storage)");

    const { probe, plan } = await this.resolvePlan(download, source, true);
    const duration = probe?.duration ?? download.torrent?.durationSeconds;
    if (!duration || duration <= 0) throw new BadRequestError("Cannot determine video duration for HLS");

    const session = await getOrCreateSession(download.id, input, duration, plan);
    return buildHlsPlaylist(session.duration, session.segmentCount);
  }

  async getHlsSegment(download: Download, index: number): Promise<Buffer> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const input = await this.resolveHlsInput(source);
    if (!input) throw new BadRequestError("HLS requires a seekable source");

    const { probe, plan } = await this.resolvePlan(download, source, true);
    const duration = probe?.duration ?? download.torrent?.durationSeconds;
    if (!duration || duration <= 0) throw new NotFoundError("Video duration unavailable");

    const session = await getOrCreateSession(download.id, input, duration, plan);
    if (index < 0 || index >= session.segmentCount) throw new NotFoundError("Segment out of range");
    return generateSegment(session, index);
  }

  /** Prepare headers + pipe closure for byte-range direct streaming. */
  async prepareDirectStream(download: Download, rangeHeader: string | undefined): Promise<DirectStreamResult> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const range = parseRangeHeader(rangeHeader, source.size);
    if (range === "unsatisfiable") {
      return { status: 416, headers: { "Content-Range": `bytes */${source.size}` } };
    }

    return {
      status: range ? 206 : 200,
      headers: buildStreamHeaders(source.fileName, source.size, range),
      pipe: (honoStream) => this.pipeSource(download.id, source, range, honoStream),
    };
  }

  /** Prepare headers + pipe closure for live fMP4 remux (active torrents). */
  async prepareLiveStream(download: Download): Promise<LiveStreamResult> {
    const source = await this.resolveSource(download);
    if (!source) throw new NotFoundError("Video file");

    const { plan } = await this.resolvePlan(download, source, false);
    const headers: Record<string, string> = { "Content-Type": "video/mp4" };
    if (download.torrent?.durationSeconds) headers["X-Video-Duration"] = String(download.torrent.durationSeconds);

    return {
      headers,
      pipe: (honoStream) => this.pipeLiveSource(download.id, source, plan, honoStream),
    };
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

  // ── Private: HLS input ─────────────────────────────────────────────

  /** Returns a local path OR a remote FFmpeg URL — both seekable by ffmpeg `-ss`. */
  private async resolveHlsInput(source: StreamSource): Promise<string | undefined> {
    if (source.filePath) return source.filePath;
    if (source.remotePath) {
      const url = await remoteStorageService.buildFfmpegUrl(source.remotePath);
      return url ?? undefined;
    }
    return undefined;
  }

  // ── Private: stream piping ─────────────────────────────────────────

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

  private async pipeLiveSource(
    downloadId: string,
    source: StreamSource,
    plan: PlaybackPlan,
    honoStream: StreamingApi,
  ): Promise<void> {
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

      const transcoded = convertToFragmentedMp4Stream(remuxInput, {
        inputFormat: getVideoInputFormat(source.fileName),
        video: plan.video,
        audio: plan.audio,
      });
      cleanups.push(transcoded.destroy);
      await pipeNodeStream(honoStream, transcoded.stream);
    } finally {
      releaseLease();
    }
  }

  // ── Private: input opening ─────────────────────────────────────────

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

  // ── Private: probe & plan ──────────────────────────────────────────

  private async resolvePlan(
    download: Download,
    source: StreamSource,
    hasCompleteFile: boolean,
  ): Promise<{ probe: VideoProbe | null; plan: PlaybackPlan }> {
    const cached = download.torrent;
    let probe: VideoProbe | null = null;

    if (cached?.videoCodec || cached?.audioCodec || cached?.durationSeconds) {
      probe = { videoCodec: cached.videoCodec, audioCodec: cached.audioCodec, duration: cached.durationSeconds };
    }

    if (source.filePath && (!cached?.videoCodec || cached.durationSeconds == null)) {
      const fresh = await probeVideoStreams({ filePath: source.filePath });
      if (fresh) {
        probe = {
          videoCodec: fresh.videoCodec ?? probe?.videoCodec,
          audioCodec: fresh.audioCodec ?? probe?.audioCodec,
          duration: fresh.duration ?? probe?.duration,
        };
        await this.cacheProbe(download.id, download.torrent, probe, cached?.moovAtStart);
      }
    }

    let moovAtStart = cached?.moovAtStart;
    if (source.filePath && moovAtStart == null && /\.(mp4|m4v)$/i.test(source.fileName)) {
      moovAtStart = await hasMoovAtStart(source.filePath);
      if (probe) await this.cacheProbe(download.id, download.torrent, probe, moovAtStart);
    }

    return { probe, plan: resolvePlaybackPlan(source.fileName, probe, { hasCompleteFile, moovAtStart }) };
  }

  // ── Private: source helpers ────────────────────────────────────────

  private tryRemoteSource(item: Download): StreamSource | undefined {
    if (!item.remoteLocation) return undefined;
    const info = buildRemoteVideoInfo(item, item.remoteLocation);
    if (!info) return undefined;
    return { size: info.size, fileName: info.fileName, remotePath: info.remotePath, isRemote: true };
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

  private async cacheProbe(
    downloadId: string,
    torrent: TorrentLiveData | null | undefined,
    probe: VideoProbe,
    moovAtStart?: boolean,
  ): Promise<void> {
    if (!torrent) return;
    await db
      .update(downloadTable)
      .set({
        torrent: {
          ...torrent,
          durationSeconds: probe.duration ?? torrent.durationSeconds,
          videoCodec: probe.videoCodec ?? torrent.videoCodec,
          audioCodec: probe.audioCodec ?? torrent.audioCodec,
          moovAtStart: moovAtStart ?? torrent.moovAtStart,
        },
      })
      .where(eq(downloadTable.id, downloadId));
  }
}
