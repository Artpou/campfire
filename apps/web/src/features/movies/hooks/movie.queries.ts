import { api, unwrap } from "@seedarr/sdk";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { MovieQueryOptions } from "tmdb-ts";

import { toDiscoverQuery } from "@/shared/helpers/query.helper";

export const movieQueries = {
  key: ["movie"] as const,
  details: (id: string, locale: string) =>
    queryOptions({
      queryKey: [...movieQueries.key, id, locale],
      queryFn: () => unwrap(api.movies[":id"].$get({ param: { id }, query: { locale } })),
    }),

  discover: (options: MovieQueryOptions, locale: string) =>
    infiniteQueryOptions({
      queryKey: [...movieQueries.key, locale, options],
      queryFn: async ({ pageParam = 1 }) =>
        unwrap(api.movies.discover.$get({ query: toDiscoverQuery(options, pageParam, locale) })),
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
      retry: 1,
    }),

  search: (q: string, locale: string) =>
    infiniteQueryOptions({
      queryKey: [...movieQueries.key, "search", q, locale],
      queryFn: async ({ pageParam = 1 }) =>
        unwrap(api.movies.search.$get({ query: { q, locale, page: pageParam.toString() } })),
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
      retry: 1,
    }),
};
