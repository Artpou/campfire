import type { ListMediaQuery, Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toPaginationQuery } from "@/shared/helpers/pagination.helper";
import { useInfiniteQueryApi } from "@/shared/hooks/use-query-api";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { QUERY_KEY } from "@/shared/query-key";

export function useMedia(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<Media>({
    queryKey: [QUERY_KEY.MEDIA, id],
    queryFn: () => unwrap(api.media[":id"].$get({ param: { id: id.toString() } })),
    enabled,
  });
}

export function useMedias(query: ListMediaQuery) {
  return useInfiniteQueryApi<Media>({
    queryKey: [QUERY_KEY.MEDIA, JSON.stringify(query)],
    queryFn: async (pagination) => {
      return await unwrap(api.media.$get({ query: toPaginationQuery(query, pagination) }));
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrap(api.media.history.$delete()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY.MEDIA] }),
  });
}

export function useToggleLike() {
  return useMutation({
    mutationFn: (media: Media) => unwrap(api.media[":id"].like.$post({ param: { id: media.id.toString() } })),
  });
}

export function useToggleWatchList() {
  return useMutation({
    mutationFn: (media: Media) => unwrap(api.media[":id"].watchlist.$post({ param: { id: media.id.toString() } })),
  });
}

export function useUpdateWatchProgress() {
  return useMutation({
    mutationFn: ({ mediaId, ...data }: { mediaId: number; position: number; duration: number; downloadId?: string }) =>
      unwrap(
        api.media[":id"].progress.$patch({
          param: { id: mediaId.toString() },
          json: data,
        }),
      ),
  });
}

export function useMediaSearch(query: string) {
  const locale = useTmdbLocale();

  return useQuery<Media[]>({
    queryKey: [QUERY_KEY.MEDIA, "search", query, locale],
    queryFn: async () => {
      const [movies, tvShows] = await Promise.all([
        unwrap(api.movies.search.$get({ query: { q: query, locale } })),
        unwrap(api.tv.search.$get({ query: { q: query, locale } })),
      ]);
      const combined = [...movies, ...tvShows];
      return combined.sort((a, b) => {
        if (a.download && !b.download) return -1;
        if (!a.download && b.download) return 1;
        return 0;
      });
    },
    enabled: query.length > 0,
  });
}

export function useTrending(type: Media["type"]) {
  const locale = useTmdbLocale();
  const queryClient = useQueryClient();

  return useQuery<Media[]>({
    queryKey: [QUERY_KEY.MEDIA, "trending", type, locale],
    queryFn: async () => {
      const data =
        type === "movie"
          ? await unwrap(api.movies.trending.$get({ query: { locale } }))
          : await unwrap(api.tv.trending.$get({ query: { locale } }));

      for (const item of data) {
        queryClient.setQueryData([QUERY_KEY.MEDIA, item.id], item);
      }
      return data;
    },
  });
}

export function useMediaKeywords(query: string, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [QUERY_KEY.MEDIA, "keywords", query],
    queryFn: () => unwrap(api.movies.keywords.$get({ query: { q: query } })),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
  });
}
