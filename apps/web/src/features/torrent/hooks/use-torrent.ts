import type { Media, Torrent, TorrentIndexer, TorrentInspectResult } from "@basement/api/types";
import { useQueries, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export function useTorrents(
  media: Media | null | undefined,
  indexers: TorrentIndexer[],
  { season, episode }: { season?: number; episode?: number } = {},
) {
  return useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", media?.id, media?.type, indexer.id, season, episode],
      queryFn: async () => {
        if (!media) return [];

        const data = await unwrap(
          api.torrents.search.$post({
            json: {
              media,
              indexerId: indexer.id,
              season,
              episode,
            },
          }),
        );

        return (data || []).filter((torrent: Torrent) => torrent.seeders > 0);
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
