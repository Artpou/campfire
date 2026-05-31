import type { Media } from "@basement/api/types";

import type { TorrentDownload } from "@/features/torrent/hooks/use-torrent-download";

export type DownloadGroupItem =
  | { kind: "single"; download: TorrentDownload }
  | {
      kind: "tv-group";
      mediaId: number;
      downloads: TorrentDownload[];
      // earliest createdAt across the group, used for sorting
      createdAt: string;
    };

/**
 * Group downloads so that multiple TV episodes/seasons belonging to the same
 * series are merged into a single grouped entry. Movies and TV downloads
 * without a known media type remain ungrouped.
 *
 * `mediasByTvId` is a lookup of mediaId -> Media (used to detect TV shows).
 */
export function groupDownloads(
  downloads: TorrentDownload[],
  mediasByTvId: Map<number, Media>,
): DownloadGroupItem[] {
  const groups = new Map<number, TorrentDownload[]>();
  const result: DownloadGroupItem[] = [];

  for (const dl of downloads) {
    const media = dl.mediaId ? mediasByTvId.get(dl.mediaId) : undefined;
    if (media?.type === "tv" && dl.mediaId) {
      const existing = groups.get(dl.mediaId);
      if (existing) {
        existing.push(dl);
      } else {
        groups.set(dl.mediaId, [dl]);
      }
    } else {
      result.push({ kind: "single", download: dl });
    }
  }

  for (const [mediaId, dls] of groups.entries()) {
    if (dls.length === 1) {
      result.push({ kind: "single", download: dls[0] });
    } else {
      const sorted = dls
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      result.push({
        kind: "tv-group",
        mediaId,
        downloads: sorted,
        createdAt: sorted[0].createdAt,
      });
    }
  }

  return result.sort((a, b) => {
    const aDate = a.kind === "single" ? a.download.createdAt : a.createdAt;
    const bDate = b.kind === "single" ? b.download.createdAt : b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}
