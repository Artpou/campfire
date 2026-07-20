import { type ReactNode, useState } from "react";

import type { Media, Movie, TV } from "@seedarr/sdk";
import { ClockPlusIcon, HeartIcon, InfoIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";

import { MediaPoster } from "@/features/media/components/media-poster";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";

type MediaDetailLayoutProps = {
  title: string;
  backdropPath?: string | null;
  posterPath?: string | null;
  media: Media | undefined;
  posterData: Movie | TV;
  downloadId?: string;
  posterType?: "movie" | "tv";
  infoSection: ReactNode;
  detailsSection: ReactNode;
  children: ReactNode;
};

export function MediaDetailLayout({
  title,
  backdropPath,
  posterPath,
  media,
  posterData,
  downloadId,
  posterType,
  infoSection,
  detailsSection,
  children,
}: MediaDetailLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const handleToggleLike = () => {
    media && toggleLike.mutate(media);
  };

  const handleToggleWatchList = () => {
    media && toggleWatchList.mutate(media);
  };

  return (
    <div className="pb-20">
      <div className="relative w-full pb-6 pt-6">
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(backdropPath) || getPosterUrl(posterPath)})`,
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
                      handleToggleLike();
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
                      handleToggleWatchList();
                    }}
                    disabled={!media}
                  >
                    <ClockPlusIcon fill={media && media.watchList > 0 ? "currentColor" : "none"} />
                  </Button>
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[350px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mx-4">{detailsSection}</div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="lg:w-1/4 max-w-[250px] justify-items-center">
            <MediaPoster data={posterData} downloadId={downloadId} download={media?.download} type={posterType} />
          </div>
          <div className="lg:w-3/4">{infoSection}</div>
          <div className="hidden xl:block w-[300px]">{detailsSection}</div>
        </Container>
      </div>

      <Container className="flex gap-8 pt-6">
        <div className="w-full flex flex-col gap-8">{children}</div>
      </Container>
    </div>
  );
}
