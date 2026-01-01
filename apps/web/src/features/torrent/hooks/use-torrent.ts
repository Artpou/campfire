import { useQueries } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { Media } from "@/features/media/media";
import type { TorrentIndexer } from "@/features/torrent/torrent";

export function useTorrents(media: Media | null | undefined, indexers: TorrentIndexer[]) {
  return useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", media?.id, media?.type, indexer.id],
      queryFn: async () => {
        if (!media) return [];
        const response = await api.torrents.search.post({
          media,
          indexerId: indexer.id,
        });

        return (response.data || []).filter((torrent) => torrent.seeders > 0);
      },
      enabled: !!media?.id,
      retry: 1,
    })),
  });
}
