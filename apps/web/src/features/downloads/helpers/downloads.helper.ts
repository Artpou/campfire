import { TorrentStatus } from "@seedarr/sdk";

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
