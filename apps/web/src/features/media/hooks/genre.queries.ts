import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const genreQueries = {
  key: ["genres"] as const,
  list: (type: Media["type"], locale: string) =>
    queryOptions({
      queryKey: [...genreQueries.key, type, locale],
      queryFn: async () => {
        const data =
          type === "movie"
            ? await unwrap(api.movies.genres.$get({ query: { locale } }))
            : await unwrap(api.tv.genres.$get({ query: { locale } }));
        return data.genres;
      },
    }),
};
