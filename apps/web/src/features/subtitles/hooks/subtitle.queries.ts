import { t } from "@lingui/core/macro";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";

export const subtitleQueries = {
  key: ["subtitles"] as const,
  external: (downloadId: string) =>
    queryOptions({
      queryKey: [...subtitleQueries.key, "external", downloadId],
      queryFn: () => unwrap(api.streaming[":id"].subtitles.$get({ param: { id: downloadId } })),
    }),

  search: (tmdbId: string, languages: string, type?: "movie" | "tv") =>
    queryOptions({
      queryKey: [...subtitleQueries.key, "search", tmdbId, languages, type],
      queryFn: () =>
        unwrap(
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
      unwrap(api.subtitles.download.$post({ json: input })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...downloadQueries.key, variables.downloadId] });
      queryClient.invalidateQueries({ queryKey: [...subtitleQueries.key, "external", variables.downloadId] });
      toast.success(t`Subtitle added`);
    },
    onError: (error) => {
      toast.error(t`Could not add subtitle`, {
        description: formatError(error),
      });
    },
  });
}
