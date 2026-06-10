import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

export interface TrailerData {
  key: string;
  name: string;
}

export function useTrailer(mediaId: number, type: "movie" | "tv", enabled = false) {
  const locale = useTmdbLocale();

  return useQuery({
    queryKey: ["media-trailer", type, mediaId, locale],
    queryFn: async (): Promise<TrailerData | undefined> => {
      if (type === "movie") {
        return unwrap(api.movies[":id"].trailer.$get({ param: { id: String(mediaId) }, query: { locale } }));
      }
      return unwrap(api.tv[":id"].trailer.$get({ param: { id: String(mediaId) }, query: { locale } }));
    },
    enabled,
    staleTime: 1000 * 60 * 60,
  });
}
