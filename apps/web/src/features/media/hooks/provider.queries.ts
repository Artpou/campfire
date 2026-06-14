import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const providerQueries = {
  key: ["providers"] as const,
  list: (type: Media["type"], locale: string) =>
    queryOptions({
      queryKey: [...providerQueries.key, type, locale],
      queryFn: async () =>
        type === "movie"
          ? await unwrap(api.movies.providers.$get({ query: { locale } }))
          : await unwrap(api.tv.providers.$get({ query: { locale } })),
    }),
};
