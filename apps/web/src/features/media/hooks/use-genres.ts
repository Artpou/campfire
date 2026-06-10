import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

export function useGenres(type: Media["type"]) {
  const locale = useTmdbLocale();

  return useQuery({
    queryKey: ["genres", type, locale],
    queryFn: async () => {
      const data =
        type === "movie"
          ? await unwrap(api.movies.genres.$get({ query: { locale } }))
          : await unwrap(api.tv.genres.$get({ query: { locale } }));
      return data.genres;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
