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
  tmdbMovieToMedia,
  tmdbTVToMedia,
} from "@/features/media/helpers/media.helper";

export function useMedia(id: number) {
  return useQuery({
    queryKey: ["media", id],
    queryFn: () => unwrap(api.media[":id"].$get({ param: { id: id.toString() } })),
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

      return mediaResults;
    },
    enabled: query.length > 0,
  });
}
