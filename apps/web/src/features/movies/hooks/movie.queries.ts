import { api, unwrap } from "@seedarr/sdk";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { MovieQueryOptions } from "tmdb-ts";

import { toDiscoverQuery } from "@/shared/helpers/query.helper";

import { queryClient } from "@/router";

export const movieQueries = {
  key: ["movie"] as const,
  details: (id: string, locale: string) =>
    queryOptions({
      queryKey: [...movieQueries.key, id, locale],
      queryFn: async () => {
        const data = await unwrap(api.movies[":id"].$get({ param: { id }, query: { locale } }));
        queryClient.setQueryData(["media", Number(id)], data.media);
        return data;
      },
    }),

  discover: (options: MovieQueryOptions, locale: string) =>
    infiniteQueryOptions({
      queryKey: [...movieQueries.key, locale, options],
      queryFn: async ({ pageParam = 1 }) => {
        const data = await unwrap(api.movies.discover.$get({ query: toDiscoverQuery(options, pageParam, locale) }));
        for (const media of data.results) {
          queryClient.setQueryData(["media", media.id], media);
        }
        return data;
      },
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
      retry: 1,
    }),
};
