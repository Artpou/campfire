import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MultiSearchResult } from "tmdb-ts";

import { api } from "@/lib/api";
import { useTMDB } from "@/shared/hooks/use-tmdb";

import {
  FMDBResult,
  fmdbResultToMedia,
  tmdbMovieToMedia,
  tmdbTVToMedia,
} from "@/features/media/helpers/media.helper";
import { Media } from "@/features/media/media";

export function useMedia(id: number) {
  return useQuery({
    queryKey: ["media", id],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noTsIgnore: Eden treaty doesn't properly type dynamic routes
      // @ts-ignore - bun type-check not working for /:id route at root level
      const response = await api.media({ id }).get();
      return response.data;
    },
  });
}

export function useRecentlyViewed(type: Media["type"], limit = 20) {
  return useInfiniteQuery({
    queryKey: ["recently-viewed", type],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.media["recently-viewed"].get({
        query: { type, page: pageParam, limit },
      });
      return response.data || { results: [], page: 1, hasMore: false };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useLikeMedia(type: Media["type"], limit = 20) {
  return useInfiniteQuery({
    queryKey: ["like-media", type],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.media.like.get({
        query: { type, page: pageParam, limit },
      });
      return response.data || { results: [], page: 1, hasMore: false };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useWatchListMedia(type: Media["type"], limit = 20) {
  return useInfiniteQuery({
    queryKey: ["watch-list-media", type],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.media["watch-list"].get({
        query: { type, page: pageParam, limit },
      });
      return response.data || { results: [], page: 1, hasMore: false };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

export function useMediaStatus(mediaId: number) {
  return useQuery({
    queryKey: ["media-status", mediaId],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noTsIgnore: Eden treaty doesn't properly type dynamic routes
      // @ts-ignore - bun type-check not working for /:id/status route
      const response = await api.media({ id: mediaId }).status.get();
      return response.data;
    },
  });
}

export function useMediaStatusBatch(mediaIds: number[]) {
  return useQuery({
    queryKey: ["media-status-batch", ...mediaIds.sort()],
    queryFn: async () => {
      if (mediaIds.length === 0) {
        return {};
      }
      const response = await api.media.status.batch.post({ mediaIds });
      return response.data as Record<number, { isLiked: boolean; isInWatchList: boolean }>;
    },
    enabled: mediaIds.length > 0,
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (media: Media) => {
      const response = await api.media.like.post(media);
      return response.data;
    },
    onSuccess: (_, media) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["media-status", media.id] });
      queryClient.invalidateQueries({ queryKey: ["media-status-batch"] });
      queryClient.invalidateQueries({ queryKey: ["like-media"] });
    },
  });
}

export function useToggleWatchList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (media: Media) => {
      const response = await api.media["watch-list"].post(media);
      return response.data;
    },
    onSuccess: (_, media) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["media-status", media.id] });
      queryClient.invalidateQueries({ queryKey: ["media-status-batch"] });
      queryClient.invalidateQueries({ queryKey: ["watch-list-media"] });
    },
  });
}

export function useMediaSearch(query: string) {
  const { tmdb, tmdbLocale } = useTMDB();

  return useQuery({
    queryKey: ["media-search", query, tmdbLocale],
    queryFn: async () => {
      const searchResults = await tmdb.search.multi({ query, language: tmdbLocale });

      // Transform results to Media type, filtering for movies and TV shows only
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

      return mediaResults;
    },
    enabled: query.length > 0,
  });
}
