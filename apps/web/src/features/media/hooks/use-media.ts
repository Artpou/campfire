import { useLingui } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import type { MultiSearchResult } from "tmdb-ts";
import { TMDB } from "tmdb-ts";

import { api } from "@/lib/api";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
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
      // @ts-ignore
      const response = await api.media({ id }).get();
      return response.data;
    },
  });
}

export function useRecentlyViewed(type: Media["type"], limit = 20) {
  return useQuery({
    queryKey: ["recently-viewed", type],
    queryFn: async () => {
      const response = await api.media["recently-viewed"].get({
        query: { type, limit },
      });
      return response.data || [];
    },
    refetchOnMount: "always",
  });
}

export type MovieList = "popular" | "toprated" | "latest" | "upcoming";
export type TVList = "popular" | "toprated" | "latest" | "airing";

export function useMovies(list: MovieList = "popular") {
  const { tmdb, tmdbLocale } = useTMDB();

  return useQuery<Media[]>({
    queryKey: ["movies", list, tmdbLocale],
    queryFn: async () => {
      switch (list) {
        case "popular": {
          const data = await tmdb.movies.popular({ language: tmdbLocale });
          return data.results.map(tmdbMovieToMedia);
        }
        case "toprated": {
          const data = await tmdb.movies.topRated({ language: tmdbLocale });
          return data.results.map(tmdbMovieToMedia);
        }
        case "upcoming": {
          const data = await tmdb.movies.upcoming({ language: tmdbLocale });
          return data.results.map(tmdbMovieToMedia);
        }
        case "latest": {
          const data = await tmdb.movies.nowPlaying({ language: tmdbLocale });
          return data.results.map(tmdbMovieToMedia);
        }
        default: {
          throw new Error("Invalid list");
        }
      }
    },
  });
}

export function useTV(list: TVList = "popular") {
  const { tmdb, tmdbLocale } = useTMDB();

  return useQuery<Media[]>({
    queryKey: ["tv", list, tmdbLocale],
    queryFn: async () => {
      switch (list) {
        case "popular": {
          const data = await tmdb.tvShows.popular({ language: tmdbLocale });
          return data.results.map(tmdbTVToMedia);
        }
        case "toprated": {
          const data = await tmdb.tvShows.topRated({ language: tmdbLocale });
          return data.results.map(tmdbTVToMedia);
        }
        case "airing": {
          const data = await tmdb.tvShows.onTheAir({ language: tmdbLocale });
          return data.results.map(tmdbTVToMedia);
        }
        case "latest": {
          const data = await tmdb.tvShows.airingToday({ language: tmdbLocale });
          return data.results.map(tmdbTVToMedia);
        }
      }
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

export interface Genre {
  id: number;
  name: string;
}

export function useMovieGenres() {
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  return useQuery({
    queryKey: ["movie-genres", tmdbLocale],
    queryFn: async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";

      if (!apiKey) {
        return [];
      }

      const tmdb = new TMDB(apiKey);
      const data = await tmdb.genres.movies({ language: tmdbLocale });
      return data.genres;
    },
  });
}

export function useTVGenres() {
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  return useQuery({
    queryKey: ["tv-genres", tmdbLocale],
    queryFn: async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";

      if (!apiKey) {
        return [];
      }

      const tmdb = new TMDB(apiKey);
      const data = await tmdb.genres.tvShows({ language: tmdbLocale });
      return data.genres;
    },
  });
}
