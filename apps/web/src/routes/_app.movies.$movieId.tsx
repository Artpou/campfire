import { useState } from "react";

import { useLingui } from "@lingui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClockPlus, Heart, Info } from "lucide-react";
import { TMDB } from "tmdb-ts";

import { api } from "@/lib/api";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { SeedarrLoader } from "@/shared/ui/seedarr-loader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaPoster } from "@/features/media/components/media-poster";
import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import {
  useMediaStatus,
  useToggleLike,
  useToggleWatchList,
} from "@/features/media/hooks/use-media";
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();
  const { data: mediaStatus } = useMediaStatus(Number(params.movieId));

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

  const handleToggleLike = () => {
    toggleLike.mutate({
      id: movie.id,
      type: "movie",
      title: movie.title || movie.original_title,
      overview: movie.overview || null,
      poster_path: movie.poster_path ?? null,
      vote_average: movie.vote_average ?? null,
      release_date: movie.release_date || null,
    });
  };

  const handleToggleWatchList = () => {
    toggleWatchList.mutate({
      id: movie.id,
      type: "movie",
      title: movie.title || movie.original_title,
      overview: movie.overview || null,
      poster_path: movie.poster_path ?? null,
      vote_average: movie.vote_average ?? null,
      release_date: movie.release_date || null,
    });
  };

  return (
    <div className="pb-20">
      {/* Hero Section with full-width background */}
      <div className="relative w-full pb-6 pt-6">
        {/* Background - full width */}
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(movie.backdrop_path)})`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.22_0.004_240/0.95)] via-[oklch(0.22_0.004_240/0.75)] to-[oklch(0.22_0.004_240/0.75)]" />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-background/10 dark:to-background" />
        </div>

        {/* Content */}
        <Container className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative">
          {/* Mobile/Tablet Details Button - Absolute positioned */}
          <div className="xl:hidden fixed mt-20 top-0 right-4 lg:right-8 z-10">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <div className="flex flex-col gap-3">
                  <Button size="icon-lg" variant="outline" rounded>
                    <Info />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={mediaStatus?.isLiked ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleLike();
                    }}
                  >
                    <Heart fill={mediaStatus?.isLiked ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={mediaStatus?.isInWatchList ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleWatchList();
                    }}
                  >
                    <ClockPlus fill={mediaStatus?.isInWatchList ? "currentColor" : "none"} />
                  </Button>
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[350px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{movie.title}</SheetTitle>
                </SheetHeader>
                <div className="mx-4">
                  <MovieDetails movie={movie} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="lg:w-1/4 max-w-[250px] justify-items-center">
            <MediaPoster media={movie} movieId={movie.id} />
          </div>
          <div className="lg:w-3/4">
            <MovieInfo movie={movie} />
          </div>
          <div className="hidden xl:block w-[300px]">
            <MovieDetails movie={movie} />
          </div>
        </Container>
      </div>

      <Container className="flex gap-8 pt-6">
        <div className="w-full flex flex-col gap-8">
          <MovieCast movie={movie} />
          <MovieRelated movie={movie} collection={collection} />
        </div>
      </Container>
    </div>
  );
}
