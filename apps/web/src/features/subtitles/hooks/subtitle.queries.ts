import type { SubdlSearchResponse } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { torrentQueries } from "@/features/torrent/hooks/torrent.queries";

export const subtitleQueries = {
  key: ["subtitles"] as const,
  external: (downloadId: string) =>
    queryOptions({
      queryKey: [...subtitleQueries.key, "external", downloadId],
      queryFn: () =>
        unwrap<{ paths: string[] }>(api.downloads[":id"]["external-subtitles"].$get({ param: { id: downloadId } })),
    }),

  search: (tmdbId: string, languages: string, type?: "movie" | "tv") =>
    queryOptions({
      queryKey: [...subtitleQueries.key, "search", tmdbId, languages, type],
      queryFn: () =>
        unwrap<SubdlSearchResponse>(
          api.subtitles.search.$get({
            query: { tmdb_id: tmdbId, languages, ...(type && { type }) },
          }),
        ),
      enabled: Boolean(tmdbId && languages),
    }),
};

export function useDownloadSubtitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { downloadId: string; url: string; language: string; mediaTitle: string }) =>
      api.subtitles.download.$post({ json: input }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...torrentQueries.key, variables.downloadId] });
      queryClient.invalidateQueries({ queryKey: [...subtitleQueries.key, "external", variables.downloadId] });
    },
  });
}
