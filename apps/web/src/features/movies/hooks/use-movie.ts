import { useMemo } from "react";

import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { CountryCode, MovieQueryOptions } from "tmdb-ts";

import { api, unwrap } from "@/lib/api";
import { useTMDB } from "@/shared/hooks/use-tmdb";

import { tmdbMovieToMedia } from "@/features/media/helpers/media.helper";
import { useMovieStore } from "@/features/movies/store/movie-store";

export function useMovieDetails(id: string) {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["movie-full", id, tmdbLocale],
    queryFn: async () => {
      const movieData = await tmdb.movies.details(Number(id), [
        "watch/providers",
        "videos",
        "credits",
        "recommendations",
        "external_ids",
        "release_dates",
        "alternative_titles",
      ]);

      const usTitle =
        movieData.alternative_titles?.titles?.find(
          (title) => title.iso_3166_1 === "US" && title.type === "",
        )?.title ||
        movieData.alternative_titles?.titles?.find((title) => title.type === "(English)")?.title;

      await unwrap(
        api.media.$post({ json: tmdbMovieToMedia({ ...movieData, us_title: usTitle }) }),
      );
      queryClient.invalidateQueries({ queryKey: ["media"] });

      let collection = null;
      if (movieData.belongs_to_collection?.id) {
        collection = await tmdb.collections.details(movieData.belongs_to_collection.id);
      }

      return { movie: movieData, collection };
    },
  });
}

export function useMovieDiscover(options: MovieQueryOptions = {}) {
  const { tmdb, tmdbLocale } = useTMDB();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["movie-discover", tmdbLocale, JSON.stringify(options)],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await tmdb.discover.movie({ ...options, page: pageParam });

      const ids = data.results.map((result) => result.id.toString());
      const localMedias =
        ids.length > 0
          ? (await unwrap(api.media.$get({ query: { type: "movie", ids: ids.join(",") } }))).results
          : [];

      const results = data.results.map((result) => {
        const media =
          localMedias.find((media) => media.id === result.id) || tmdbMovieToMedia(result);
        queryClient.setQueryData(["media", media.id], media);
        return media;
      });

      return {
        results,
        page: data.page,
        totalPages: data.total_pages,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const results = useMemo(
    () => query.data?.pages.flatMap((page) => page.results) ?? [],
    [query.data],
  );

  return { ...query, results };
}

export function useMovieGenres() {
  const { tmdb, tmdbLocale } = useTMDB();
  const { movieGenres, setMovieGenres } = useMovieStore();

  return useQuery({
    queryKey: ["movie-genres", tmdbLocale],
    queryFn: async () => {
      if (movieGenres[tmdbLocale]) {
        return movieGenres[tmdbLocale];
      }

      const data = await tmdb.genres.movies({ language: tmdbLocale });
      setMovieGenres(tmdbLocale, data.genres);
      return data.genres;
    },
  });
}

export function useMovieProviders() {
  const { tmdb, tmdbLocale } = useTMDB();
  const { movieProviders, setMovieProviders } = useMovieStore();

  const NUMBER_OF_PROVIDERS = 5;

  return useQuery({
    queryKey: ["movie-providers", tmdbLocale],
    queryFn: async () => {
      if (movieProviders[tmdbLocale]) {
        return movieProviders[tmdbLocale].slice(0, NUMBER_OF_PROVIDERS);
      }

      const data = await tmdb.watchProviders.getMovieProviders();
      // Extract country code from locale (e.g., "fr-FR" -> "FR")
      const country = (tmdbLocale.split("-")[1] || "US") as CountryCode;

      const result = data.results
        .filter(
          (provider, index, self) =>
            provider.logo_path &&
            provider.display_priorities?.[country] &&
            // deduplicate by provider_name
            index === self.findIndex((p) => p.provider_name === provider.provider_name),
        )
        .sort((a, b) => a.display_priorities[country] - b.display_priorities[country])
        .map((provider) => {
          // don't need display_priorities for the UI
          provider.display_priorities = {} as typeof provider.display_priorities;
          return provider;
        });

      setMovieProviders(tmdbLocale, result);
      return result.slice(0, NUMBER_OF_PROVIDERS);
    },
  });
}
