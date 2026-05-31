import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ClockPlus, Heart, Info } from "lucide-react";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaPoster } from "@/features/media/components/media-poster";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { useMedia, useToggleLike, useToggleWatchList } from "@/features/media/hooks/use-media";
import { TvCast } from "@/features/tv/components/tv-cast";
import { TvDetails } from "@/features/tv/components/tv-details";
import { TvEpisodesSection } from "@/features/tv/components/tv-episodes-section";
import { TvInfo } from "@/features/tv/components/tv-info";
import { TvRelated } from "@/features/tv/components/tv-related";
import { useTVDetails } from "@/features/tv/hook/use-tv";

export const Route = createFileRoute("/_app/tv/$id/")({
  component: TVPage,
});

function TVPage() {
  const params = Route.useParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();
  const { data: media } = useMedia(Number(params.id));

  const { data, isLoading } = useTVDetails(params.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center size-full">
        <SeedarrLoader />
      </div>
    );
  }

  if (!data?.tv) {
    return null;
  }

  const { tv } = data;

  const handleToggleLike = () => {
    media && toggleLike.mutate(media);
  };

  const handleToggleWatchList = () => {
    media && toggleWatchList.mutate(media);
  };

  return (
    <div className="pb-20">
      {/* Hero Section with full-width background */}
      <div className="relative w-full pb-6 pt-6">
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(tv.backdrop_path) || getPosterUrl(tv.poster_path)})`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.22_0.004_240/0.95)] via-[oklch(0.22_0.004_240/0.75)] to-[oklch(0.22_0.004_240/0.75)]" />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-background/10 dark:to-background" />
        </div>

        <Container className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative">
          {/* Mobile/Tablet Details Button */}
          <div className="xl:hidden fixed mt-20 top-0 right-4 lg:right-8 z-10">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <div className="flex flex-col gap-3">
                  <Button size="icon-lg" variant="outline" rounded>
                    <Info />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={media?.like ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleLike();
                    }}
                    disabled={!media}
                  >
                    <Heart fill={media?.like ? "currentColor" : "none"} />
                  </Button>
                  <Button
                    size="icon-lg"
                    variant={media?.watchList ? "default" : "outline"}
                    rounded
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggleWatchList();
                    }}
                    disabled={!media}
                  >
                    <ClockPlus fill={media?.watchList ? "currentColor" : "none"} />
                  </Button>
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[350px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{tv.name}</SheetTitle>
                </SheetHeader>
                <div className="mx-4">
                  <TvDetails
                    tv={tv}
                    isLiked={media?.like}
                    isInWatchList={media?.watchList}
                    onToggleLike={handleToggleLike}
                    onToggleWatchList={handleToggleWatchList}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="lg:w-1/4 max-w-[250px] justify-items-center">
            <MediaPoster media={tv} id={tv.id} type="tv" />
          </div>
          <div className="lg:w-3/4">
            <TvInfo tv={tv} />
          </div>
          <div className="hidden xl:block w-[300px]">
            <TvDetails
              tv={tv}
              isLiked={media?.like}
              isInWatchList={media?.watchList}
              onToggleLike={handleToggleLike}
              onToggleWatchList={handleToggleWatchList}
            />
          </div>
        </Container>
      </div>

      <Container className="flex gap-8 pt-6">
        <div className="w-full flex flex-col gap-8">
          <TvEpisodesSection tv={tv} />
          <TvCast tv={tv} />
          <TvRelated tv={tv} />
        </div>
      </Container>
    </div>
  );
}
