import { useMemo } from "react";

import { api, unwrap } from "@seedarr/sdk";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SeasonSelection, TvShowQueryOptions } from "tmdb-ts";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

function toDiscoverQuery(options: TvShowQueryOptions, page: number, locale: string): Record<string, string> {
  const query: Record<string, string> = { locale, page: page.toString() };
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || key === "page") continue;
    query[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return query;
}

export function useTVDetails(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const locale = useTmdbLocale();
  const queryClient = useQueryClient();

  return useQuery({
    enabled,
    queryKey: ["tv-full", id, locale],
    queryFn: async () => {
      const data = await unwrap(api.tv[":id"].$get({ param: { id }, query: { locale } }));
      queryClient.setQueryData(["media", Number(id)], data.media);
      return data;
    },
  });
}

export function useTVSeasonDetails(selection: SeasonSelection, { enabled = true }: { enabled?: boolean } = {}) {
  const locale = useTmdbLocale();

  return useQuery({
    enabled,
    queryKey: ["tv-season", selection.tvShowID, selection.seasonNumber, locale],
    queryFn: () =>
      unwrap(
        api.tv[":id"].season[":number"].$get({
          param: {
            id: selection.tvShowID.toString(),
            number: selection.seasonNumber.toString(),
          },
        }),
      ),
  });
}

export function useTVDiscover(options: TvShowQueryOptions = {}) {
  const locale = useTmdbLocale();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["tv-discover", locale, JSON.stringify(options)],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await unwrap(api.tv.discover.$get({ query: toDiscoverQuery(options, pageParam, locale) }));
      for (const media of data.results) {
        queryClient.setQueryData(["media", media.id], media);
      }
      return data;
    },
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const results = useMemo(() => query.data?.pages.flatMap((page) => page.results) ?? [], [query.data]);

  return { ...query, results };
}
