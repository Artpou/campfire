import { useMemo } from "react";

import type { IndexerType } from "@seedarr/contracts";
import type { Media, ModuleIndexer, Torrent } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions, useQueries } from "@tanstack/react-query";

import { getSeasonEpisodeRelevance } from "@/features/torrent/helpers/torrent-sort.helper";

export const torrentQueries = {
  key: ["torrent"] as const,
  inspect: (magnetUri: string | null, indexerSeeders?: number) =>
    queryOptions({
      queryKey: [...torrentQueries.key, "inspect", magnetUri, indexerSeeders],
      queryFn: () => {
        if (!magnetUri) throw new Error("No magnet URI provided");
        return unwrap(
          api.torrents.inspect.$get({
            query: {
              magnet: magnetUri,
              ...(indexerSeeders !== undefined ? { indexerSeeders: String(indexerSeeders) } : {}),
            },
          }),
        );
      },
      enabled: !!magnetUri,
    }),
};

export type TorrentSource = {
  id: string;
  label: string;
  moduleId: string;
  indexerType: IndexerType;
  indexerId?: string;
};

function buildTorrentSources(indexers: ModuleIndexer[]): TorrentSource[] {
  return indexers.flatMap((indexer) => {
    if (indexer.disabled) return [];

    if (indexer.indexers.length > 0) {
      return indexer.indexers.map((entry) => ({
        id: entry.id,
        label: entry.label ?? entry.name,
        moduleId: indexer.id,
        indexerType: indexer.indexerType,
        indexerId: entry.id,
      }));
    }

    return [
      {
        id: indexer.id,
        label: indexer.indexerType === "stremio" ? "Torrentio" : (indexer.indexerUrl ?? indexer.indexerType),
        moduleId: indexer.id,
        indexerType: indexer.indexerType,
      },
    ];
  });
}

interface UseTorrentsOptions {
  season?: number;
  episode?: number;
}

export function useTorrents(media: Media, indexers: ModuleIndexer[], { season, episode }: UseTorrentsOptions = {}) {
  const sources = useMemo(() => buildTorrentSources(indexers), [indexers]);

  return useQueries({
    queries: sources.map(({ moduleId, indexerId }) => ({
      queryKey: [...torrentQueries.key, media.id, media.type, moduleId, indexerId, season, episode],
      queryFn: async () => {
        if (!media) return [];

        const data = await unwrap(
          api.torrents.list.$post({
            json: {
              media,
              moduleId,
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
            indexerType: source.indexerType,
            moduleId: source.moduleId,
          }));
        })
        .sort((a, b) => {
          const relevanceDiff =
            getSeasonEpisodeRelevance(b, season, episode) - getSeasonEpisodeRelevance(a, season, episode);
          if (relevanceDiff !== 0) return relevanceDiff;

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
