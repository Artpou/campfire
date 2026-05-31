import { useMemo } from "react";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CountryCode, SeasonSelection, TvShowQueryOptions } from "tmdb-ts";

import { api, unwrap } from "@/lib/api";
import { useTMDB } from "@/shared/hooks/use-tmdb";

import { tmdbTVToMedia } from "@/features/media/helpers/media.helper";
import { useTVStore } from "@/features/tv/store/tv-store";

export function useTVDetails(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  return useQuery({
    enabled,
    queryKey: ["tv-full", id, tmdbLocale],
    queryFn: async () => {
      const tvData = await tmdb.tvShows.details(Number(id), [
        "watch/providers",
        "videos",
        "credits",
        "recommendations",
        "external_ids",
        "aggregate_credits",
      ]);

      await unwrap(api.media.$post({ json: tmdbTVToMedia(tvData) }));
      queryClient.invalidateQueries({ queryKey: ["media"] });

      return { tv: tvData };
    },
  });
}

export function useTVSeasonDetails(
  selection: SeasonSelection,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const { tmdb, tmdbLocale } = useTMDB();

  return useQuery({
    enabled,
    queryKey: ["tv-season", selection.tvShowID, selection.seasonNumber, tmdbLocale],
    queryFn: async () => {
      return tmdb.tvSeasons.details(selection);
    },
  });
}

export function useTVDiscover(options: TvShowQueryOptions = {}) {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["tv-discover", tmdbLocale, JSON.stringify(options)],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await tmdb.discover.tvShow({ ...options, page: pageParam });

      const ids = data.results.map((result) => result.id.toString());
      const localMedias =
        ids.length > 0
          ? (await unwrap(api.media.$get({ query: { type: "tv", ids: ids.join(",") } }))).results
          : [];

      const results = data.results.map((result) => {
        const media = localMedias.find((m) => m.id === result.id) || tmdbTVToMedia(result);
        queryClient.setQueryData(["media", media.id], media);
        return media;
      });

      return {
        results,
        page: data.page,
        totalPages: data.total_pages,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const results = useMemo(
    () => query.data?.pages.flatMap((page) => page.results) ?? [],
    [query.data],
  );

  return { ...query, results };
}

export function useTVGenres() {
  const { tmdb, tmdbLocale } = useTMDB();
  const { tvGenres, setTVGenres } = useTVStore();

  return useQuery({
    queryKey: ["tv-genres", tmdbLocale],
    queryFn: async () => {
      // Check if genres exist in store for this locale
      if (tvGenres[tmdbLocale]) {
        return tvGenres[tmdbLocale];
      }

      // Fetch from API and store
      const data = await tmdb.genres.tvShows({ language: tmdbLocale });
      setTVGenres(tmdbLocale, data.genres);
      return data.genres;
    },
  });
}

export function useTVProviders() {
  const { tmdb, tmdbLocale } = useTMDB();
  const { tvProviders, setTVProviders } = useTVStore();

  const NUMBER_OF_PROVIDERS = 5;

  return useQuery({
    queryKey: ["tv-providers", tmdbLocale],
    queryFn: async () => {
      if (tvProviders[tmdbLocale]) {
        return tvProviders[tmdbLocale].slice(0, NUMBER_OF_PROVIDERS);
      }

      const data = await tmdb.watchProviders.getTvProviders();
      // Extract country code from locale (e.g., "fr-FR" -> "FR")
      const country = (tmdbLocale.split("-")[1] || "US") as CountryCode;

      const result = data.results
        .filter(
          (provider, index, self) =>
            provider.logo_path &&
            provider.display_priorities?.[country] &&
            // deduplicate by provider_name
            index === self.findIndex((p) => p.provider_name === provider.provider_name),
        )
        .sort((a, b) => a.display_priorities[country] - b.display_priorities[country])
        .map((provider) => {
          // don't need display_priorities for the UI
          provider.display_priorities = {} as typeof provider.display_priorities;
          return provider;
        });

      setTVProviders(tmdbLocale, result);
      return result.slice(0, NUMBER_OF_PROVIDERS);
    },
  });
}
