import type { StreamingApi } from "hono/utils/stream";
import type WebTorrent from "webtorrent";

import { BadRequestError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { assertWithinDownloads, getDownloadsRoot, resolveWithinDownloads } from "@/helpers/path.helper";
import { pipeNodeStream } from "@/helpers/stream.helper";
import { srt2webvtt } from "@/helpers/subtitle.helper";
import { convertToFragmentedMp4Stream, getVideoInputFormat, shouldTranscodeForPlayback } from "@/helpers/video.helper";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import type { Dirent } from "node:fs";
import fsSync from "node:fs";
import * as path from "node:path";
import type { Download } from "./download.dto";
import type { TorrentLiveData } from "./download.schema";
import {
  type ByteRange,
  buildRemoteVideoInfo,
  buildStreamHeaders,
  isFsNotFoundError,
  parseRangeHeader,
  VIDEO_EXTENSIONS,
} from "./download-stream.helper";
import { torrentClient } from "./webtorrent.client";
import { findLargestVideoFile } from "./webtorrent.helper";

export interface StreamResult {
  size: number;
  fileName: string;
  /** Present for local disk / already-opened sources. Absent for remote until opened with range. */
  stream?: NodeJS.ReadableStream;
  filePath?: string;
  remotePath?: string;
  torrentFile?: WebTorrent.TorrentFile;
  cleanup?: () => void;
  isRemote?: boolean;
}

export type PlaybackPlan =
  | { type: "rangeNotSatisfiable"; size: number }
  | {
      type: "ready";
      status: 200 | 206;
      headers: Record<string, string>;
      download: Download;
      source: StreamResult;
      range?: ByteRange;
      useTranscodedStream: boolean;
    };

export interface DownloadFilePayload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  size: number;
}

function playbackLocation(source: StreamResult): { origin: "remote" | "local" | "torrent"; path: string } {
  if (source.isRemote && source.remotePath) return { origin: "remote", path: source.remotePath };
  if (source.filePath) return { origin: "local", path: source.filePath };
  return { origin: "torrent", path: source.fileName };
}

export class DownloadStreamService {
  async getStreamForDownload(download: Download): Promise<StreamResult | undefined> {
    // Completed downloads: prefer seekable disk file (no ffmpeg remux).
    if (download.torrent?.done) {
      const fromDisk = await this.getStreamFromDisk(download);
      if (fromDisk) return fromDisk;
    }

    if (download.remoteLocation) {
      const remote = this.tryRemoteSource(download);
      if (remote) return remote;
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

    return this.getStreamFromDisk(download);
  }

  /** Prefer stored remoteLocation — playback falls back to local if remote fails. */
  private tryRemoteSource(item: Download): StreamResult | undefined {
    const remoteLocation = item.remoteLocation;
    if (!remoteLocation) return undefined;

    const info = buildRemoteVideoInfo(item, remoteLocation);
    if (!info) return undefined;

    return {
      size: info.size,
      fileName: info.fileName,
      remotePath: info.remotePath,
      isRemote: true,
    };
  }

  async buildPlaybackPlan(download: Download, rangeHeader?: string): Promise<PlaybackPlan> {
    const source = await this.getStreamForDownload(download);
    if (!source) throw new NotFoundError("Video file");

    const location = playbackLocation(source);
    logger.info("STREAM", `Playback ${location.origin}: ${location.path}`);

    const { fileName, size, filePath } = source;
    const useTranscodedStream = shouldTranscodeForPlayback(fileName, Boolean(filePath) || Boolean(source.isRemote));

    if (useTranscodedStream) {
      return {
        type: "ready",
        status: 200,
        headers: { "Content-Type": "video/mp4" },
        download,
        source,
        useTranscodedStream: true,
      };
    }

    const range = parseRangeHeader(rangeHeader, size);
    if (range === "unsatisfiable") return { type: "rangeNotSatisfiable", size };

    return {
      type: "ready",
      status: range ? 206 : 200,
      headers: buildStreamHeaders(fileName, size, range),
      download,
      source,
      range,
      useTranscodedStream: false,
    };
  }

  async pipePlayback(plan: Extract<PlaybackPlan, { type: "ready" }>, honoStream: StreamingApi): Promise<void> {
    let { source, range, useTranscodedStream } = plan;
    const cleanups: Array<() => void> = [];
    const runCleanup = (): void => {
      for (const fn of cleanups) fn();
    };
    honoStream.onAbort(runCleanup);

    if (source.isRemote) {
      if (!source.remotePath) return;
      try {
        const remote = await remoteStorageService.createReadStream(source.remotePath, range);
        if (!remote) throw new Error("Remote stream unavailable");
        if (remote.cleanup) cleanups.push(remote.cleanup);
        await pipeNodeStream(honoStream, remote.stream);
        return;
      } catch (error) {
        logger.warn("STREAM", `Remote playback failed, falling back to local: ${error}`);
        const local = await this.getStreamFromDisk(plan.download);
        if (!local) return;
        source = local;
        useTranscodedStream = shouldTranscodeForPlayback(local.fileName, Boolean(local.filePath));
      }
    }

    const opened = await this.openSourceStream(source, range);
    cleanups.push(() => {
      if ("destroy" in opened && typeof opened.destroy === "function") opened.destroy();
    });
    if (source.cleanup) cleanups.push(source.cleanup);

    if (!useTranscodedStream) {
      await pipeNodeStream(honoStream, opened);
      return;
    }

    const transcoded = convertToFragmentedMp4Stream(opened, getVideoInputFormat(source.fileName));
    cleanups.push(transcoded.destroy);
    await pipeNodeStream(honoStream, transcoded.stream);
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

  async listExternalSubtitles(download: Download): Promise<{ paths: string[] }> {
    const fs = await import("node:fs/promises");
    const downloadsRoot = getDownloadsRoot();
    const folderPath = resolveWithinDownloads(download.torrent?.name ?? "");

    const torrentPaths = new Set(
      ((download.torrent?.files ?? []) as TorrentLiveData["files"])
        .filter((f) => /\.(srt|vtt)$/i.test(f.path))
        .map((f) => path.join(download.torrent?.name ?? "", f.path).replace(/\\/g, "/")),
    );

    const collected: string[] = [];

    const scan = async (dir: string): Promise<void> => {
      let entries: Dirent[];
      try {
        entries = (await fs.readdir(dir, { withFileTypes: true })) as Dirent[];
      } catch {
        return;
      }

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(full);
          continue;
        }
        const rel = path.relative(downloadsRoot, full).replace(/\\/g, "/");
        if (/\.(srt|vtt)$/i.test(entry.name) && !torrentPaths.has(rel)) collected.push(rel);
      }
    };

    await scan(folderPath);
    return { paths: collected };
  }

  async getSubtitleVtt(download: Download, rawFilePath: string): Promise<string> {
    const filePath = decodeURIComponent(rawFilePath);
    const lower = filePath.toLowerCase();
    if (!lower.endsWith(".srt") && !lower.endsWith(".vtt")) {
      throw new BadRequestError("Only .srt and .vtt files are supported");
    }

    const fs = await import("node:fs/promises");
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);

    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundError("Subtitle file");
    }

    const content = await this.decodeSubtitleFile(fullPath);
    return lower.endsWith(".vtt") ? content : srt2webvtt(content);
  }

  private async decodeSubtitleFile(fullPath: string): Promise<string> {
    const iconv = await import("iconv-lite");
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(fullPath);

    const utf8 = iconv.default.decode(buffer, "utf-8");
    return utf8.includes("\ufffd") ? iconv.default.decode(buffer, "win1252") : utf8;
  }

  private async openSourceStream(source: StreamResult, range?: ByteRange): Promise<NodeJS.ReadableStream> {
    if (source.torrentFile) {
      return range ? source.torrentFile.createReadStream(range) : source.torrentFile.createReadStream();
    }
    if (source.filePath) {
      return range ? fsSync.createReadStream(source.filePath, range) : fsSync.createReadStream(source.filePath);
    }
    if (source.stream) return source.stream;
    throw new Error("No local stream source available");
  }

  private async getStreamFromDisk(download: Download): Promise<StreamResult | undefined> {
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "");
    const fs = await import("node:fs/promises");

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isFile()) {
        const fileName = path.basename(fullPath);
        return VIDEO_EXTENSIONS.test(fileName)
          ? { stream: fsSync.createReadStream(fullPath), size: stats.size, fileName, filePath: fullPath }
          : undefined;
      }

      return await this.findLargestVideoInFolder(fullPath);
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      if (isFsNotFoundError(error)) return undefined;
      throw error;
    }
  }

  private async findLargestVideoInFolder(fullPath: string): Promise<StreamResult | undefined> {
    const fs = await import("node:fs/promises");
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
    return {
      stream: fsSync.createReadStream(largest.path),
      size: largest.size,
      fileName: largest.name,
      filePath: largest.path,
    };
  }
}
