import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ClockPlus, Heart, Info } from "lucide-react";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaPoster } from "@/features/media/components/media-poster";
import {
  getBackdropUrl,
  getPosterUrl,
  tmdbMovieToMedia,
} from "@/features/media/helpers/media.helper";
import {
  useMediaStatus,
  useToggleLike,
  useToggleWatchList,
} from "@/features/media/hooks/use-media";
import { MovieCast } from "@/features/movies/components/movie-cast";
import { MovieDetails } from "@/features/movies/components/movie-details";
import { MovieInfo } from "@/features/movies/components/movie-info";
import { MovieRelated } from "@/features/movies/components/movie-related";
import { useMovieDetails } from "@/features/movies/hooks/use-movie";

export const Route = createFileRoute("/_app/movies/$movieId/")({
  component: MoviePage,
});

function MoviePage() {
  const params = Route.useParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();
  const { data: mediaStatus } = useMediaStatus(Number(params.movieId));

  const { data, isLoading } = useMovieDetails(params.movieId);

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
    toggleLike.mutate(tmdbMovieToMedia(movie));
  };

  const handleToggleWatchList = () => {
    toggleWatchList.mutate(tmdbMovieToMedia(movie));
  };

  return (
    <div className="pb-20">
      {/* Hero Section with full-width background */}
      <div className="relative w-full pb-6 pt-6">
        {/* Background - full width */}
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(movie.backdrop_path) || getPosterUrl(movie.poster_path)})`,
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
                  <MovieDetails
                    movie={movie}
                    isLiked={mediaStatus?.isLiked}
                    isInWatchList={mediaStatus?.isInWatchList}
                    onToggleLike={handleToggleLike}
                    onToggleWatchList={handleToggleWatchList}
                  />
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
            <MovieDetails
              movie={movie}
              isLiked={mediaStatus?.isLiked}
              isInWatchList={mediaStatus?.isInWatchList}
              onToggleLike={handleToggleLike}
              onToggleWatchList={handleToggleWatchList}
            />
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
