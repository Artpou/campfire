import { type ReactNode, useMemo } from "react";

import type { Media } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { InfoIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCardHorizontal } from "@/features/media/components/card/media-card-horizontal";
import { getRemainingTime, getWatchProgressPercent } from "@/features/media/helpers/media.helper";
import { preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";

const MAX_ITEMS = 20;

interface MediaCarouselHorizontalProps {
  title: string | ReactNode;
  medias: Media[];
  seeMoreTo?: string;
  seeMoreSearch?: Record<string, unknown>;
}

export function MediaCarouselHorizontal({ title, medias, seeMoreTo, seeMoreSearch }: MediaCarouselHorizontalProps) {
  const uniqueMedias = useMemo(() => {
    if (!medias || medias.length === 0) return [];
    const uniqueMap = new Map(medias.map((item) => [item.id, item]));
    return Array.from(uniqueMap.values()).slice(0, MAX_ITEMS);
  }, [medias]);

  if (!medias || uniqueMedias.length === 0) return null;

  return (
    <CarouselWrapper title={title} seeMoreTo={seeMoreTo} seeMoreSearch={seeMoreSearch}>
      {uniqueMedias.map((item) => (
        <CarouselItem
          key={item.id}
          className="w-auto basis-[85%] sm:basis-[55%] md:basis-[42%] lg:basis-[34%] xl:basis-[28%]"
          onMouseEnter={item.download?.id ? preloadMoviPlayer : undefined}
          onFocus={item.download?.id ? preloadMoviPlayer : undefined}
          onPointerDown={item.download?.id ? preloadMoviPlayer : undefined}
        >
          <MediaCardHorizontal media={item}>
            <div className="flex items-end justify-between gap-1">
              {getRemainingTime(item) && <Badge variant="secondary">{getRemainingTime(item)}</Badge>}

              <Link to={item.type === "tv" ? "/tv/$id" : "/movies/$id"} params={{ id: item.id.toString() }}>
                <Button variant="secondary" size="icon" icon={InfoIcon} aria-label="Info" />
              </Link>
            </div>

            <div
              className="absolute left-0 bottom-0 h-1.5 bg-primary rounded-r-md"
              style={{ width: `${getWatchProgressPercent(item)}%` }}
            />
            <div className="w-full absolute left-0 bottom-0 h-1.5 bg-primary/40" />
          </MediaCardHorizontal>
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
