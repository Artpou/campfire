import type { Download, TorrentInspectFile, TorrentStatus } from "@seedarr/sdk";

export function getDownloadStatus(item: {
  error?: string | null;
  torrent?: {
    done?: boolean;
    paused?: boolean;
  } | null;
}): TorrentStatus {
  if (item.error) return "failed";
  if (!item.torrent) return "queued";
  if (item.torrent.done) return "completed";
  if (item.torrent.paused) return "paused";
  return "downloading";
}

/**
 * Extract typed torrent files from a download's opaque JSON torrent field.
 * Hono RPC doesn't preserve Drizzle's `$type<T>()` through JSON serialization,
 * so this single helper narrows the type for all consumers.
 */
export function getTorrentFiles(download: Download): TorrentInspectFile[] {
  const files = download.torrent?.files;
  if (!Array.isArray(files)) return [];
  return files as TorrentInspectFile[];
}
