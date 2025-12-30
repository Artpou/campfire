import { useLingui } from "@lingui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TMDB } from "tmdb-ts";

import { api } from "@/lib/api";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { SeedarrLoader } from "@/shared/ui/seedarr-loader";

import { MediaPoster } from "@/features/media/components/media-poster";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { MovieCast } from "@/features/movies/components/movie-cast";
import { MovieDetails } from "@/features/movies/components/movie-details";
import { MovieInfo } from "@/features/movies/components/movie-info";
import { MovieRelated } from "@/features/movies/components/movie-related";

export const Route = createFileRoute("/_app/movies/$movieId")({
  component: MoviePage,
});

function MoviePage() {
  const params = Route.useParams();
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["movie-full", params.movieId, tmdbLocale],
    queryFn: async () => {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";
      const tmdb = new TMDB(apiKey);

      // Single request with all data
      const movieData = await tmdb.movies.details(
        Number(params.movieId),
        ["watch/providers", "videos", "credits", "recommendations", "external_ids"],
        tmdbLocale,
      );

      // Track the movie view
      await api.media.track.post({
        type: "movie",
        ...movieData,
        id: Number(params.movieId),
        title: movieData.title || movieData.original_title,
        poster_path: movieData.poster_path ?? null,
      });

      // Invalidate recently-viewed cache after tracking
      queryClient.invalidateQueries({ queryKey: ["recently-viewed"] });

      // Fetch collection if exists
      let collection = null;
      if (movieData.belongs_to_collection?.id) {
        collection = await tmdb.collections.details(movieData.belongs_to_collection.id, {
          language: tmdbLocale,
        });
      }

      return { movie: movieData, collection };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center size-full">
        <SeedarrLoader />
      </div>
    );
  }

  if (!data?.movie) {
    return null;
  }

  const { movie, collection } = data;

  return (
    <div className="pb-20">
      {/* Hero Section with full-width background */}
      <div className="relative w-full pb-6 pt-6 sm:pt-12">
        {/* Background - full width */}
        <div
          className="absolute inset-0 bg-cover bg-center -z-10"
          style={{
            backgroundImage: `url(${getBackdropUrl(movie.backdrop_path)})`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-linear-to-b from-black via-background/10 to-background" />
          {/* <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent via-background/60 to-background" /> */}
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <MediaPoster media={movie} movieId={movie.id} />
            <div className="md:col-span-3">
              <MovieInfo movie={movie} />
            </div>
            <MovieDetails movie={movie} />
          </div>
        </div>
      </div>

      <MovieCast movie={movie} />
      <MovieRelated movie={movie} collection={collection} />
    </div>
  );
}
