import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClockIcon, MagnetIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { formatRuntime } from "@/shared/helpers/date";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@/shared/ui/carousel";
import { Progress } from "@/shared/ui/progress";

import { useRole } from "@/features/auth/hooks/use-role";
import { DownloadProgressCircular } from "@/features/downloads/components/download-progress-circular";
import { MediaRating } from "@/features/media/components/media-rating";
import {
  getBackdropUrl,
  getEndsAtForMedia,
  getPosterUrl,
  getWatchProgressPercent,
  hasWatchProgress,
} from "@/features/media/helpers/media.helper";
import { mediaQueries, refetchLibraryInterval } from "@/features/media/hooks/media.queries";

const AUTO_ROTATE_MS = 7000;
const MAX_OVERVIEW_LENGTH = 220;

interface HeroCarouselProps {
  type: Media["type"];
}

function getDetailLinkProps(media: Media) {
  return media.type === "tv"
    ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
    : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);
}

function getTorrentsLinkProps(media: Media) {
  return media.type === "tv"
    ? ({ to: "/tv/$id/torrents", params: { id: media.id.toString() } } as const)
    : ({ to: "/movies/$id/torrents", params: { id: media.id.toString() } } as const);
}

function getPlayLinkProps(media: Media) {
  const downloadId = media.download?.id ?? media.progress?.downloadId;
  if (!downloadId) return null;
  return { to: "/downloads/$id/play", params: { id: downloadId } } as const;
}

interface HeroSlideProps {
  media: Media;
  isLibraryMode: boolean;
}

const HeroSlide = memo(function HeroSlide({ media, isLibraryMode }: HeroSlideProps) {
  const { role } = useRole();
  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";
  const detailLinkProps = getDetailLinkProps(media);
  const torrentsLinkProps = getTorrentsLinkProps(media);
  const playLinkProps = getPlayLinkProps(media);
  const endsAt = getEndsAtForMedia(media);
  const isDownloading = !!media.download && !media.download.torrent?.done;
  const showWatchProgress = isLibraryMode && hasWatchProgress(media);

  const backdropUrl = getBackdropUrl(media.backdrop_path, "w1280") || getPosterUrl(media.poster_path, "w780");

  return (
    <div className="relative w-full h-[360px] md:h-[400px]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backdropUrl})` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/80 to-background/20" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
      </div>

      <div className="relative h-full container mx-auto max-w-6xl px-8 md:px-12 flex items-end pb-12 md:pb-16 gap-5 md:gap-8">
        {media.poster_path && (
          <Link {...detailLinkProps} className="hidden sm:block relative shrink-0 group/poster">
            <img
              src={getPosterUrl(media.poster_path, "w342")}
              alt={media.title}
              className="w-[110px] md:w-[150px] aspect-2/3 rounded-lg object-cover border border-border/60 shadow-2xl transition-transform group-hover/poster:scale-[1.02]"
            />
            {isLibraryMode && isDownloading && media.download && (
              <div className="absolute top-2 left-2">
                <DownloadProgressCircular download={media.download} />
              </div>
            )}
            {showWatchProgress && (
              <Progress
                value={getWatchProgressPercent(media)}
                variant="white"
                className="absolute z-10 bottom-2 left-2 right-2 w-auto"
              />
            )}
          </Link>
        )}

        <div className="max-w-2xl space-y-3 min-w-0">
          <h1>{media.title}</h1>

          <div className="flex items-center gap-2 flex-wrap text-sm">
            {year && <span className="text-muted-foreground font-medium">{year}</span>}
            {media.duration != null && media.duration > 0 && (
              <>
                {year && <span className="text-muted-foreground/40">·</span>}
                <Badge variant="outline" className="gap-1">
                  <ClockIcon className="size-3" />
                  {formatRuntime(media.duration)}
                </Badge>
              </>
            )}
            {endsAt && (
              <Badge variant="secondary">
                <Trans>Ends at</Trans> {endsAt}
              </Badge>
            )}
          </div>

          {media.overview && (
            <p className="text-xs md:text-sm text-popover-foreground font-medium leading-relaxed line-clamp-2 md:line-clamp-3 max-w-xl">
              {media.overview.length > MAX_OVERVIEW_LENGTH
                ? `${media.overview.slice(0, MAX_OVERVIEW_LENGTH)}...`
                : media.overview}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            {media.vote_average != null && media.vote_average > 0 && (
              <MediaRating media={media} size={44} strokeWidth={4} />
            )}

            {role !== "viewer" && isLibraryMode && playLinkProps && (
              <Button asChild size="lg" className="shadow-lg">
                <Link {...playLinkProps}>
                  <PlayIcon className="size-4 fill-current" />
                  {showWatchProgress ? <Trans>Resume</Trans> : <Trans>Watch</Trans>}
                </Link>
              </Button>
            )}

            {role !== "viewer" && !isLibraryMode && (
              <Button asChild size="lg" className="shadow-lg">
                <Link {...torrentsLinkProps}>
                  <MagnetIcon className="size-4" />
                  <Trans>Torrents</Trans>
                </Link>
              </Button>
            )}

            <Button asChild variant="secondary" size="lg">
              <Link {...detailLinkProps}>
                <Trans>Details</Trans>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export function HeroCarousel({ type }: HeroCarouselProps) {
  const locale = useTmdbLocale();
  const { data: library, isLoading: isLibraryLoading } = useQuery({
    ...mediaQueries.library(type),
    refetchInterval: refetchLibraryInterval,
  });
  const { data: trending, isLoading: isTrendingLoading } = useQuery(mediaQueries.trending(type, locale));

  const hasLibrary = !!library?.length;
  const isLibraryMode = hasLibrary;

  const data = useMemo(() => (isLibraryMode ? library : trending) ?? [], [isLibraryMode, library, trending]);
  const hasData = data.length > 0;

  const isLoading = isLibraryLoading || (!isLibraryMode && isTrendingLoading);

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const onSelect = useCallback(() => {
    if (!carouselApi) return;
    setSelectedIndex(carouselApi.selectedScrollSnap());
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;
    onSelect();
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, onSelect]);

  useEffect(() => {
    if (!carouselApi || isHovered || !hasData) return;
    const interval = setInterval(() => {
      if (carouselApi.canScrollNext()) carouselApi.scrollNext();
      else carouselApi.scrollTo(0);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [carouselApi, isHovered, hasData]);

  const carouselKey = useMemo(() => data.map((item) => `${item.type}-${item.id}`).join("-"), [data]);
  const scrollHandlers = useMemo(() => data.map((_, i) => () => carouselApi?.scrollTo(i)), [data, carouselApi]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  if (isLoading) {
    return (
      <div className="h-[400px] md:h-[450px] flex items-center justify-center">
        <SeedarrLoader />
      </div>
    );
  }

  if (!hasData) return null;

  return (
    <section
      aria-label="Hero carousel"
      className="relative -mt-14"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Carousel key={carouselKey} setApi={setCarouselApi} opts={{ loop: true }} className="w-full overflow-hidden">
        <CarouselContent className="ml-0 gap-0">
          {data.map((item) => (
            <CarouselItem
              key={`${item.type}-${item.id}`}
              className="pl-0 basis-full border-0 hover:border-transparent rounded-none"
            >
              <HeroSlide media={item} isLibraryMode={isLibraryMode} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {!!data?.length && data.length > 1 && (
        <div className="absolute md:bottom-2 left-0 right-0 z-10">
          <div className="container mx-auto max-w-6xl px-4 md:px-6 flex items-center justify-center">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Carousel navigation">
              {data.map((item, index) => (
                <button
                  key={`dot-${item.type}-${item.id}`}
                  type="button"
                  role="tab"
                  aria-selected={index === selectedIndex}
                  aria-label={item.title}
                  onClick={scrollHandlers[index]}
                  className={cn(
                    "rounded-full transition-all duration-300",
                    index === selectedIndex
                      ? "w-5 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-foreground/25 hover:bg-foreground/50",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
