import { api, unwrap } from "@seedarr/sdk";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { TvShowQueryOptions } from "tmdb-ts";

import { toDiscoverQuery } from "@/shared/helpers/query.helper";

export const tvQueries = {
  key: ["tv"] as const,
  details: (id: string, locale: string) =>
    queryOptions({
      queryKey: [...tvQueries.key, "full", id, locale],
      queryFn: () => unwrap(api.tv[":id"].$get({ param: { id }, query: { locale } })),
    }),

  season: (tvShowID: number, seasonNumber: number, locale: string) =>
    queryOptions({
      queryKey: [...tvQueries.key, "season", tvShowID, seasonNumber, locale],
      queryFn: () =>
        unwrap(
          api.tv[":id"].season[":number"].$get({
            param: {
              id: tvShowID.toString(),
              number: seasonNumber.toString(),
            },
          }),
        ),
    }),

  discover: (options: TvShowQueryOptions, locale: string) =>
    infiniteQueryOptions({
      queryKey: [...tvQueries.key, "discover", locale, options],
      queryFn: async ({ pageParam = 1 }) =>
        unwrap(api.tv.discover.$get({ query: toDiscoverQuery(options, pageParam, locale) })),
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
      retry: 1,
    }),

  search: (q: string, locale: string) =>
    infiniteQueryOptions({
      queryKey: [...tvQueries.key, "search", q, locale],
      queryFn: async ({ pageParam = 1 }) =>
        unwrap(api.tv.search.$get({ query: { q, locale, page: pageParam.toString() } })),
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
      retry: 1,
    }),
};
