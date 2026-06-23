import { useState } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ClockPlusIcon, HeartIcon, InfoIcon } from "lucide-react";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaPoster } from "@/features/media/components/media-poster";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";
import { MovieCast } from "@/features/movies/components/movie-cast";
import { MovieDetails } from "@/features/movies/components/movie-details";
import { MovieInfo } from "@/features/movies/components/movie-info";
import { MovieRelated } from "@/features/movies/components/movie-related";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export const Route = createFileRoute("/_app/movies/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(movieQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: MoviePage,
  pendingComponent: () => <SeedarrLoaderContainer />,
});

function MoviePage() {
  const params = Route.useParams();
  const context = Route.useRouteContext();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data } = useSuspenseQuery(movieQueries.details(params.id, context.language));

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const { media, movie } = data;

  return (
    <div className="pb-20">
      <div className="relative w-full pb-6 pt-6">
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(movie.backdrop_path) || getPosterUrl(movie.poster_path)})`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.22_0.004_240/0.95)] via-[oklch(0.22_0.004_240/0.75)] to-[oklch(0.22_0.004_240/0.75)]" />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-background/10 dark:to-background" />
        </div>

        <Container className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative">
          <div className="xl:hidden fixed mt-20 top-0 right-4 lg:right-8 z-10">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <div className="flex flex-col gap-3">
                  <Button size="icon-lg" variant="outline" rounded>
                    <InfoIcon />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={media && media.likes > 0 ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      toggleLike.mutate(media);
                    }}
                    disabled={!media}
                  >
                    <HeartIcon fill={media && media.likes > 0 ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={media && media.watchList > 0 ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWatchList.mutate(media);
                    }}
                    disabled={!media}
                  >
                    <ClockPlusIcon fill={media && media.watchList > 0 ? "currentColor" : "none"} />
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
                    isLiked={media ? media.likes > 0 : undefined}
                    isInWatchList={media ? media.watchList > 0 : undefined}
                    onToggleLike={() => toggleLike.mutate(media)}
                    onToggleWatchList={() => toggleWatchList.mutate(media)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="lg:w-1/4 max-w-[250px] justify-items-center">
            <MediaPoster data={data} downloadId={media?.download?.id} />
          </div>
          <div className="lg:w-3/4">
            <MovieInfo movie={movie} />
          </div>
          <div className="hidden xl:block w-[300px]">
            <MovieDetails
              movie={movie}
              isLiked={media ? media.likes > 0 : undefined}
              isInWatchList={media ? media.watchList > 0 : undefined}
              onToggleLike={() => toggleLike.mutate(media)}
              onToggleWatchList={() => toggleWatchList.mutate(media)}
            />
          </div>
        </Container>
      </div>

      <Container className="flex gap-8 pt-6">
        <div className="w-full flex flex-col gap-8">
          <MovieCast movie={movie} />
          <MovieRelated
            collection={data.collection}
            collectionMedia={data.related.collection}
            recommendedMovies={data.related.recommendations}
          />
        </div>
      </Container>
    </div>
  );
}
