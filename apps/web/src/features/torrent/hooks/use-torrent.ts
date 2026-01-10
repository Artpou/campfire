import type { Media, Torrent, TorrentIndexer, TorrentInspectResult } from "@basement/api/types";
import { useQueries, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export function useTorrents(media: Media | null | undefined, indexers: TorrentIndexer[]) {
  return useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", media?.id, media?.type, indexer.id],
      queryFn: async () => {
        if (!media) return [];

        try {
          const data = await unwrap(
            api.torrents.search.$post({
              json: {
                media,
                indexerId: indexer.id,
              },
            }),
          );

          return (data || []).filter((torrent: Torrent) => torrent.seeders > 0);
        } catch {
          return [];
        }
      },
      enabled: !!media?.id,
      retry: 1,
    })),
  });
}

export function useTorrentInspect(magnetUri: string | null) {
  return useQuery({
    queryKey: ["torrent", "inspect", magnetUri],
    queryFn: async () => {
      if (!magnetUri) throw new Error("No magnet URI provided");

      const response = await api.torrents.inspect.$get({
        query: { magnet: magnetUri },
      });

      // biome-ignore lint/suspicious/noExplicitAny: TODO
      return unwrap<TorrentInspectResult>(response as any);
    },
    enabled: !!magnetUri,
    staleTime: 0,
    gcTime: 0,
  });
}
