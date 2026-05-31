import type { Ids, Media } from "@basement/api/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListMediaSchema } from "node_modules/@basement/api/src/modules/media/media.dto";
import type { MultiSearchResult } from "tmdb-ts";

import { api, unwrap } from "@/lib/api";
import { useInfiniteQueryApi } from "@/shared/hooks/use-query-api";
import { useTMDB } from "@/shared/hooks/use-tmdb";

import {
  FMDBResult,
  fmdbResultToMedia,
  type TrendingMedia,
  tmdbMovieToMedia,
  tmdbMovieToTrendingMedia,
  tmdbTVToMedia,
  tmdbTVToTrendingMedia,
} from "@/features/media/helpers/media.helper";

export function useMedia(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["media", id],
    queryFn: () => unwrap(api.media[":id"].$get({ param: { id: id.toString() } })),
    enabled,
  });
}

export function useMedias(params: ListMediaSchema) {
  const queryClient = useQueryClient();

  return useInfiniteQueryApi<Media>({
    queryKey: ["medias", params.filter, params],
    queryFn: async ({ pageParam }) => {
      const data = await unwrap(
        api.media.$get({ query: { ...params, page: pageParam.toString() } }),
      );

      data.results.forEach((result) => {
        queryClient.setQueryData(["media", result.id], result);
      });

      return data;
    },
  });
}

export function useMediasStatus(ids: Ids) {
  return useQuery({
    queryKey: ["medias-status", ids],
    queryFn: () => unwrap(api.media.status.$post({ json: ids.map((id) => id.toString()) })),
  });
}

export function useMediasByIds(ids: number[], { enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["medias-by-ids", ids],
    queryFn: async () => {
      if (ids.length === 0) return [];
      const data = await unwrap(
        api.media.$get({
          query: { ids: ids.join(","), limit: ids.length.toString() },
        }),
      );
      data.results.forEach((result) => {
        queryClient.setQueryData(["media", result.id], result);
      });
      return data.results;
    },
    enabled: enabled && ids.length > 0,
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrap(api.media.history.$delete()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medias", "recently-viewed"] });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Media) => unwrap(api.media.like.$post({ json: data })),
    onSuccess: (updatedMedia) => {
      queryClient.setQueryData(["media", updatedMedia.id], updatedMedia);
      queryClient.invalidateQueries({ queryKey: ["medias", "like"] });
      queryClient.invalidateQueries({ queryKey: ["medias-status"] });
    },
  });
}

export function useToggleWatchList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Media) => unwrap(api.media["watch-list"].$post({ json: data })),
    onSuccess: (updatedMedia) => {
      queryClient.setQueryData(["media", updatedMedia.id], updatedMedia);
      queryClient.invalidateQueries({ queryKey: ["medias", "watch-list"] });
      queryClient.invalidateQueries({ queryKey: ["medias-status"] });
    },
  });
}

export function useMediaSearch(query: string) {
  const { tmdb, tmdbLocale } = useTMDB();

  return useQuery({
    queryKey: ["media-search", query, tmdbLocale],
    queryFn: async () => {
      const searchResults = await tmdb.search.multi({ query, language: tmdbLocale });

      const mediaResults: Media[] = [];

      for (const result of searchResults.results) {
        if (result.media_type === "movie") {
          const movie = result as Extract<MultiSearchResult, { media_type: "movie" }>;
          mediaResults.push(tmdbMovieToMedia(movie));
        } else if (result.media_type === "tv") {
          const tv = result as Extract<MultiSearchResult, { media_type: "tv" }>;
          mediaResults.push(tmdbTVToMedia(tv));
        }
      }

      const FMDB_URL = "https://imdb.iamidiotareyoutoo.com/";

      if (mediaResults.length === 0) {
        const fmdbData = await fetch(`${FMDB_URL}/justwatch?q=${query}`);
        const fmdbResult = await fmdbData.json();
        mediaResults.push(
          ...fmdbResult.description.map((result: FMDBResult) => fmdbResultToMedia(result)),
        );
      }

      const ids = mediaResults.map((m) => m.id.toString());
      if (ids.length > 0) {
        try {
          const statuses = await unwrap(api.media.status.$post({ json: ids }));
          for (const media of mediaResults) {
            const status = statuses.find((s) => s.id === media.id);
            if (status) {
              media.download = status.download ?? false;
              media.downloadId = status.downloadId;
            }
          }
          mediaResults.sort((a, b) => {
            if (a.download && !b.download) return -1;
            if (!a.download && b.download) return 1;
            return 0;
          });
        } catch {}
      }

      return mediaResults;
    },
    enabled: query.length > 0,
  });
}

const TRENDING_LIMIT = 10;

export function useTrendingMovies() {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["trending-movies", tmdbLocale],
    queryFn: async (): Promise<TrendingMedia[]> => {
      const data = await tmdb.discover.movie({
        sort_by: "popularity.desc",
        with_release_type: "4|5",
      } as Record<string, unknown> as Parameters<typeof tmdb.discover.movie>[0]);
      const results = (data.results as unknown as Record<string, unknown>[])
        .slice(0, TRENDING_LIMIT)
        .map((item) =>
          tmdbMovieToTrendingMedia(
            item as unknown as Parameters<typeof tmdbMovieToTrendingMedia>[0],
          ),
        );

      const ids = results.map((item) => item.id.toString());
      const localMedias =
        ids.length > 0
          ? (await unwrap(api.media.$get({ query: { type: "movie", ids: ids.join(",") } }))).results
          : [];

      return results.map((item) => {
        const local = localMedias.find((media) => media.id === item.id);
        const merged = { ...item, ...local };
        queryClient.setQueryData(["media", merged.id], merged);
        return merged;
      });
    },
  });
}

export function useTrendingTV() {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["trending-tv", tmdbLocale],
    queryFn: async (): Promise<TrendingMedia[]> => {
      const data = await tmdb.trending.tv();
      const results = data.results
        .slice(0, TRENDING_LIMIT)
        .map((item) =>
          tmdbTVToTrendingMedia(item as unknown as Parameters<typeof tmdbTVToTrendingMedia>[0]),
        );

      const ids = results.map((item) => item.id.toString());
      const localMedias =
        ids.length > 0
          ? (await unwrap(api.media.$get({ query: { type: "tv", ids: ids.join(",") } }))).results
          : [];

      return results.map((item) => {
        const local = localMedias.find((media) => media.id === item.id);
        const merged = { ...item, ...local };
        queryClient.setQueryData(["media", merged.id], merged);
        return merged;
      });
    },
  });
}

export function useContinueWatching(type?: Media["type"]) {
  return useQuery({
    queryKey: ["continue-watching", type],
    queryFn: () =>
      unwrap(
        api.media["continue-watching"].$get({
          query: type ? { type } : {},
        }),
      ),
  });
}

export function useWatchProgress(mediaId: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["watch-progress", mediaId],
    queryFn: () => unwrap(api.media[":id"].progress.$get({ param: { id: mediaId.toString() } })),
    enabled: enabled && mediaId > 0,
  });
}

export function useUpdateWatchProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      mediaId,
      ...data
    }: {
      mediaId: number;
      position: number;
      duration: number;
      downloadId?: string;
    }) =>
      unwrap(
        api.media[":id"].progress.$patch({
          param: { id: mediaId.toString() },
          json: data,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["continue-watching"] });
    },
  });
}
