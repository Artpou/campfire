import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

export function useProviders(type: Media["type"]) {
  const locale = useTmdbLocale();

  return useQuery({
    queryKey: ["providers", type, locale],
    queryFn: async () => {
      const data =
        type === "movie"
          ? await unwrap(api.movies.providers.$get({ query: { locale } }))
          : await unwrap(api.tv.providers.$get({ query: { locale } }));
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
