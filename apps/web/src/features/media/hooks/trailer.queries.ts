import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const trailerQueries = {
  key: ["media-trailer"] as const,
  get: (media: Media, locale: string) =>
    queryOptions({
      queryKey: [...trailerQueries.key, media.type, media.id, locale],
      queryFn: async () =>
        media.type === "movie"
          ? unwrap(api.movies[":id"].trailer.$get({ param: { id: String(media.id) }, query: { locale } }))
          : unwrap(api.tv[":id"].trailer.$get({ param: { id: String(media.id) }, query: { locale } })),
    }),
};
