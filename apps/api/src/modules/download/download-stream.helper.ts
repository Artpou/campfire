import type { Download } from "./download.dto";

export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

export interface ByteRange {
  start: number;
  end: number;
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
  const videos = (download.torrent?.files ?? [])
    .filter((f) => VIDEO_EXTENSIONS.test(f.name))
    .sort((a, b) => b.length - a.length);
  return videos[0] ?? null;
}

/** WebTorrent paths include the torrent root name — strip it for joins under torrent.name / remotePath. */
function relativeToTorrentRoot(download: Download, videoPath: string, fallbackName: string): string {
  const torrentName = download.torrent?.name ?? "";
  const rel = videoPath.replace(/\\/g, "/");
  if (!torrentName) return rel || fallbackName;
  if (rel === torrentName) return fallbackName;
  return rel.startsWith(`${torrentName}/`) ? rel.slice(torrentName.length + 1) : rel || fallbackName;
}

export function buildRemoteVideoInfo(
  download: Download,
  torrentRemotePath: string,
): { remotePath: string; size: number; fileName: string } | null {
  const video = pickLargestVideoFromTorrent(download);
  const size = video?.length ?? download.torrent?.length ?? 0;

  // Single-file torrents are uploaded to torrentRemotePath itself (the .mkv/.mp4 path).
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
