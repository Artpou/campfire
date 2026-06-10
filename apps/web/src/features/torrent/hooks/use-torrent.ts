import type { Media, Torrent, TorrentIndexerQuery } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useQueries, useQuery } from "@tanstack/react-query";

export function useTorrents(
  media: Media | null | undefined,
  indexers: TorrentIndexerQuery[],
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
    queryFn: () => {
      if (!magnetUri) throw new Error("No magnet URI provided");
      return unwrap(api.torrents.inspect.$get({ query: { magnet: magnetUri } }));
    },
    enabled: !!magnetUri,
    staleTime: 0,
    gcTime: 0,
  });
}
