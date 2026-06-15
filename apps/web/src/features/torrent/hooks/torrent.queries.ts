import type { Media, Torrent, TorrentIndexerQuery } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions, useQueries } from "@tanstack/react-query";

export const torrentQueries = {
  key: ["torrent"] as const,
  inspect: (magnetUri: string | null) =>
    queryOptions({
      queryKey: [...torrentQueries.key, "inspect", magnetUri],
      queryFn: () => {
        if (!magnetUri) throw new Error("No magnet URI provided");
        return unwrap(api.torrents.inspect.$get({ query: { magnet: magnetUri } }));
      },
      enabled: !!magnetUri,
    }),
};

interface UseTorrentsOptions {
  season?: number;
  episode?: number;
  imdbId?: string;
}

export function useTorrents(
  media: Media | null | undefined,
  indexers: TorrentIndexerQuery[],
  { season, episode, imdbId }: UseTorrentsOptions = {},
) {
  return useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: [
        ...torrentQueries.key,
        media?.id,
        media?.type,
        indexer.indexerManagerId,
        indexer.id,
        season,
        episode,
        imdbId,
      ],
      queryFn: async () => {
        if (!media) return [];

        const data = await unwrap(
          api.torrents.search.$post({
            json: {
              media,
              indexerManagerId: indexer.indexerManagerId ?? "",
              indexerId: indexer.id,
              imdbId,
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
    combine: (results) => {
      const indexerQueriesStats = results.map((query) => {
        const data = query.data ?? [];
        let status: "loading" | "success" | "error" | "idle" = "idle";

        if (query.isFetching) status = "loading";
        else if (query.isError) status = "error";
        else if (query.isSuccess) status = "success";

        return { status, count: data.length };
      });

      const seenLinks = new Set<string>();

      const allTorrents = results
        .flatMap((query, index) => {
          if (!query.data) return [];
          const indexer = indexers[index];

          return query.data.map((torrent) => ({
            ...torrent,
            indexerId: indexer?.id,
            indexerManagerType: indexer?.indexerManagerType,
          }));
        })
        .filter((torrent) => {
          if (!torrent.link) return false;

          if (seenLinks.has(torrent.link)) return false;

          seenLinks.add(torrent.link);
          return true;
        });

      const year = new Date(media?.release_date || "").getFullYear().toString();

      const sortedTorrents = allTorrents.sort((a, b) => {
        const aHasYear = a.title.includes(year);
        const bHasYear = b.title.includes(year);
        if (aHasYear && !bHasYear) return -1;
        if (!aHasYear && bHasYear) return 1;
        return b.seeders - a.seeders;
      });

      const isFetching = results.some((query) => query.isFetching);

      return {
        torrents: sortedTorrents,
        indexerStats: indexerQueriesStats,
        isLoading: sortedTorrents.length === 0 && isFetching,
        isFetching,
      };
    },
  });
}
