import { useCallback, useEffect, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MagnetIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Button } from "@/shared/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";

import { useRole } from "@/features/auth/hooks/use-role";
import { MediaRating } from "@/features/media/components/media-rating";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";

const AUTO_ROTATE_MS = 5000;
const MAX_OVERVIEW_LENGTH = 200;

interface HeroCarouselProps {
  type: Media["type"];
}

function HeroSlide({ media }: { media: Media }) {
  const { role } = useRole();
  const year = media.release_date ? new Date(media.release_date).getFullYear() : "";
  const detailLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: media.id.toString() } } as const);
  const torrentsLinkProps =
    media.type === "tv"
      ? ({ to: "/tv/$id/torrents", params: { id: media.id.toString() } } as const)
      : ({ to: "/movies/$id/torrents", params: { id: media.id.toString() } } as const);

  const backdropUrl = getBackdropUrl(media.backdrop_path, "w1280") || getPosterUrl(media.poster_path, "w780");

  return (
    <Link {...detailLinkProps} className="block relative w-full h-[40vh] md:h-[50vh]">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backdropUrl})` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative h-full container mx-auto max-w-6xl px-4 md:px-6 flex items-end pb-10 md:pb-14 gap-6">
        {media.poster_path && (
          <img
            src={getPosterUrl(media.poster_path, "w342")}
            alt={media.title}
            className="hidden sm:block w-[120px] md:w-[160px] aspect-2/3 rounded-md object-cover border border-secondary shadow-2xl shrink-0"
          />
        )}

        <div className="max-w-xl space-y-2 min-w-0">
          <h2 className="text-2xl md:text-4xl font-black tracking-tight leading-tight">{media.title}</h2>
          {year && <p className="text-sm text-muted-foreground font-medium">{year}</p>}

          {media.overview && (
            <p className="text-xs md:text-sm text-popover-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
              {media.overview.slice(0, MAX_OVERVIEW_LENGTH)}
              {media.overview.length > MAX_OVERVIEW_LENGTH ? "..." : ""}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            {media.vote_average != null && media.vote_average > 0 && (
              <MediaRating media={media} size={44} strokeWidth={4} />
            )}

            {role !== "viewer" && (
              <Button asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Link {...torrentsLinkProps}>
                  <MagnetIcon className="size-4" />
                  <Trans>Torrents</Trans>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HeroCarousel({ type }: HeroCarouselProps) {
  const locale = useTmdbLocale();
  const { data, isLoading } = useQuery(mediaQueries.trending(type, locale));

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
    if (!carouselApi || isHovered || !data?.length) return;

    const interval = setInterval(() => {
      if (carouselApi.canScrollNext()) {
        carouselApi.scrollNext();
      } else {
        carouselApi.scrollTo(0);
      }
    }, AUTO_ROTATE_MS);

    return () => clearInterval(interval);
  }, [carouselApi, isHovered, data?.length]);

  if (isLoading) {
    return (
      <div className="h-[40vh] md:h-[50vh] flex items-center justify-center">
        <SeedarrLoader />
      </div>
    );
  }

  if (!data?.length) return null;

  return (
    <section
      aria-label="Hero carousel"
      className="relative -mt-14"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Carousel setApi={setCarouselApi} opts={{ loop: true }} className="w-full overflow-hidden">
        <CarouselContent className="ml-0 gap-0">
          {data.map((item) => (
            <CarouselItem
              key={`${item.type}-${item.id}`}
              className="pl-0 basis-full sm:basis-full md:basis-full lg:basis-full xl:basis-full 2xl:basis-full border-0 hover:border-transparent rounded-none"
            >
              <HeroSlide media={item} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-30 hidden md:flex" />
        <CarouselNext className="right-30 hidden md:flex" />
      </Carousel>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {data.map((item, index) => (
          <button
            key={`dot-${item.type}-${item.id}`}
            type="button"
            aria-label={`Slide ${index + 1}`}
            className={cn(
              "h-1 rounded-full transition-all",
              index === selectedIndex ? "bg-primary w-6" : "bg-muted-foreground/40 w-2",
            )}
            onClick={() => carouselApi?.scrollTo(index)}
          />
        ))}
      </div>
    </section>
  );
}
