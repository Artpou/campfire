import { VIDEO_EXTENSIONS } from "@seedarr/shared";

import { pickLargestVideoFromEntries } from "@/shared/helpers/video-file.helper";

import type { Download } from "@/modules/download/download.schema";
import type { RemoteFileEntry } from "@/modules/storage-config/adapters/storage.adapter";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";

export interface ByteRange {
  start: number;
  end: number;
}

export interface RemoteVideoInfo {
  remotePath: string;
  size: number;
  fileName: string;
}

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase();
  if (ext.endsWith(".webm")) return "video/webm";
  if (ext.endsWith(".avi")) return "video/x-msvideo";
  if (ext.endsWith(".mov")) return "video/quicktime";
  if (ext.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

export function parseRangeHeader(
  rangeHeader: string | undefined,
  size: number,
): ByteRange | "unsatisfiable" | undefined {
  if (!rangeHeader) return undefined;

  const [startStr, endStr] = rangeHeader.replace(/bytes=/, "").split("-");
  const start = Number.parseInt(startStr, 10);
  const end = endStr ? Number.parseInt(endStr, 10) : size - 1;

  const isValid = !Number.isNaN(start) && start >= 0 && start <= end && end < size;
  return isValid ? { start, end } : "unsatisfiable";
}

export function buildStreamHeaders(fileName: string, size: number, range?: ByteRange): Record<string, string> {
  if (!range) {
    return {
      "Content-Type": getContentType(fileName),
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    };
  }
  return {
    "Content-Type": getContentType(fileName),
    "Content-Range": `bytes ${range.start}-${range.end}/${size}`,
    "Content-Length": String(range.end - range.start + 1),
    "Accept-Ranges": "bytes",
  };
}

export function isFsNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function pickLargestVideoFromTorrent(download: Download): { name: string; path: string; length: number } | null {
  return pickLargestVideoFromEntries(download.torrent?.files ?? []) ?? null;
}

function pickLargestVideoFromRemoteFiles(files: RemoteFileEntry[]): RemoteFileEntry | null {
  return pickLargestVideoFromEntries(files) ?? null;
}

function relativeToTorrentRoot(download: Download, videoPath: string, fallbackName: string): string {
  const torrentName = download.torrent?.name ?? "";
  const rel = videoPath.replace(/\\/g, "/");
  if (!torrentName) return rel || fallbackName;
  if (rel === torrentName) return fallbackName;
  return rel.startsWith(`${torrentName}/`) ? rel.slice(torrentName.length + 1) : rel || fallbackName;
}

/** Sync path using torrent.files metadata (may be null after local delete). */
function buildRemoteVideoInfo(download: Download, torrentRemotePath: string): RemoteVideoInfo | null {
  const video = pickLargestVideoFromTorrent(download);
  const size = video?.length ?? download.torrent?.length ?? 0;

  if (VIDEO_EXTENSIONS.test(torrentRemotePath.split("/").pop() ?? "")) {
    const fileName = torrentRemotePath.split("/").pop() ?? torrentRemotePath;
    return { remotePath: torrentRemotePath, size, fileName };
  }

  if (!video) return null;

  const relative = relativeToTorrentRoot(download, video.path, video.name);
  return {
    remotePath: `${torrentRemotePath}/${relative}`.replace(/\/+/g, "/"),
    size: video.length,
    fileName: video.name,
  };
}

/** Prefer torrent metadata; fall back to listing the remote directory. */
export async function resolveRemoteVideoInfo(
  download: Download,
  torrentRemotePath: string,
): Promise<RemoteVideoInfo | null> {
  const fromTorrent = buildRemoteVideoInfo(download, torrentRemotePath);
  if (fromTorrent) return fromTorrent;

  if (VIDEO_EXTENSIONS.test(torrentRemotePath.split("/").pop() ?? "")) {
    const fileName = torrentRemotePath.split("/").pop() ?? torrentRemotePath;
    return { remotePath: torrentRemotePath, size: 0, fileName };
  }

  const files = await remoteStorageService.listFiles(torrentRemotePath);
  const video = pickLargestVideoFromRemoteFiles(files);
  if (!video) return null;

  return {
    remotePath: `${torrentRemotePath}/${video.path}`.replace(/\/+/g, "/"),
    size: video.length,
    fileName: video.name,
  };
}
