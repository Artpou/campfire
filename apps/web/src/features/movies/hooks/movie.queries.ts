import type { Movie, tmdbDiscoverQuery } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { queryClient } from "@/router";

function toDiscoverQuery(options: tmdbDiscoverQuery, page: number, locale: string): Record<string, string> {
  const query: Record<string, string> = { locale, page: page.toString() };
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || key === "page") continue;
    query[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return query;
}

export const movieQueries = {
  details: (id: string, locale: string) =>
    queryOptions({
      queryKey: ["movie-full", id, locale],
      queryFn: async () => {
        const data = await unwrap<Movie>(api.movies[":id"].$get({ param: { id }, query: { locale } }));
        queryClient.setQueryData(["media", Number(id)], data.media);
        return data;
      },
    }),

  discover: (options: tmdbDiscoverQuery, locale: string) =>
    infiniteQueryOptions({
      queryKey: ["movie-discover", locale, options],
      queryFn: async ({ pageParam = 1 }) => {
        const data = await unwrap(api.movies.discover.$get({ query: toDiscoverQuery(options, pageParam, locale) }));
        for (const media of data.results) {
          queryClient.setQueryData(["media", media.id], media);
        }
        return data;
      },
      getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
    }),
};
