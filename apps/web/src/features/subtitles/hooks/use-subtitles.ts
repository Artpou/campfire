import type { SubdlSearchResponse } from "@basement/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export function useSearchSubtitles(tmdbId: string, languages: string, type?: "movie" | "tv") {
  return useQuery({
    queryKey: ["subtitles", "search", tmdbId, languages, type],
    queryFn: () =>
      unwrap<SubdlSearchResponse>(
        api.subtitles.search.$get({
          query: { tmdb_id: tmdbId, languages, ...(type && { type }) },
        }),
      ),
    enabled: Boolean(tmdbId && languages),
  });
}

export function useDownloadSubtitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      downloadId: string;
      url: string;
      language: string;
      mediaTitle: string;
    }) => unwrap<{ relativePath: string }>(api.subtitles.download.$post({ json: input })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["torrent-download", variables.downloadId],
      });
      queryClient.invalidateQueries({
        queryKey: ["external-subtitles", variables.downloadId],
      });
    },
  });
}

export function useExternalSubtitles(downloadId: string) {
  return useQuery({
    queryKey: ["external-subtitles", downloadId],
    queryFn: () =>
      unwrap<{ paths: string[] }>(
        api.downloads[":id"]["external-subtitles"].$get({
          param: { id: downloadId },
        }),
      ),
    enabled: Boolean(downloadId),
  });
}
