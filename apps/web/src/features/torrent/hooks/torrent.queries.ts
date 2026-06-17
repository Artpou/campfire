import { useMemo } from "react";

import type { IndexerManager, IndexerType, Media, Torrent } from "@seedarr/sdk";
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

export type TorrentSource = {
  id: string;
  label: string;
  indexerManagerId: string;
  indexerManagerType: IndexerType;
  indexerId?: string;
};

function buildTorrentSources(managers: IndexerManager[]): TorrentSource[] {
  return managers.flatMap((manager) => {
    if (manager.disabled) return [];

    if (manager.indexers.length > 0) {
      return manager.indexers.map((indexer) => ({
        id: indexer.id,
        label: indexer.label ?? indexer.name,
        indexerManagerId: manager.id,
        indexerManagerType: manager.indexerType,
        indexerId: indexer.id,
      }));
    }

    return [
      {
        id: manager.id,
        label: manager.indexerType === "stremio" ? "Torrentio" : (manager.indexerUrl ?? manager.indexerType),
        indexerManagerId: manager.id,
        indexerManagerType: manager.indexerType,
      },
    ];
  });
}

interface UseTorrentsOptions {
  season?: number;
  episode?: number;
}

export function useTorrents(media: Media, managers: IndexerManager[], { season, episode }: UseTorrentsOptions = {}) {
  const sources = useMemo(() => buildTorrentSources(managers), [managers]);

  return useQueries({
    queries: sources.map(({ indexerManagerId, indexerId }) => ({
      queryKey: [...torrentQueries.key, media, indexerManagerId, indexerId, season, episode],
      queryFn: async () => {
        if (!media) return [];

        const data = await unwrap(
          api.torrents.list.$post({
            json: {
              media,
              indexerManagerId,
              indexerId,
              season,
              episode,
            },
          }),
        );

        return data.filter((torrent) => torrent.seeders > 0);
      },
    })),
    combine: (results) => {
      const indexerStats = results.map((query) => {
        const data = query.data ?? [];
        let status: "loading" | "success" | "error" | "idle" = "idle";

        if (query.isFetching) status = "loading";
        else if (query.isError) status = "error";
        else if (query.isSuccess) status = "success";

        return { status, count: data.length };
      });

      const year = new Date(media?.release_date || "").getFullYear().toString();

      const torrents = results
        .flatMap((query, index) => {
          if (!query.data) return [];
          const source = sources[index];

          return query.data.map((torrent: Torrent) => ({
            ...torrent,
            indexerId: source.id,
            indexerManagerType: source.indexerManagerType,
          }));
        })
        .sort((a, b) => {
          const aHasYear = a.title.includes(year);
          const bHasYear = b.title.includes(year);
          if (aHasYear && !bHasYear) return -1;
          if (!aHasYear && bHasYear) return 1;
          return b.seeders - a.seeders;
        });

      const isFetching = results.some((query) => query.isFetching);

      return {
        torrents,
        sources,
        indexerStats,
        isLoading: torrents.length === 0 && isFetching,
        isFetching,
      };
    },
  });
}
