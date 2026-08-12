import { type ReactNode, useMemo } from "react";

import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";

import { handleSafeClick } from "@/shared/helpers/button.helper";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCard } from "@/features/media/components/card/media-card";

const MAX_ITEMS = 20;

interface MediaCarouselProps {
  title: string | ReactNode;
  data: Media[];
  seeMoreTo?: string;
  seeMoreSearch?: Record<string, unknown>;
  showType?: boolean;
}

export function MediaCarousel({ title, data, seeMoreTo, seeMoreSearch, showType }: MediaCarouselProps) {
  const navigate = useNavigate();

  const displayedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const uniqueMap = new Map(data.map((item) => [item.id, item]));
    return Array.from(uniqueMap.values()).slice(0, MAX_ITEMS);
  }, [data]);

  if (!data || displayedData.length === 0) return null;

  return (
    <CarouselWrapper title={title} seeMoreTo={seeMoreTo} seeMoreSearch={seeMoreSearch}>
      {displayedData.map((item) => (
        <CarouselItem
          key={item.id}
          className="cursor-pointer"
          onClick={(e) =>
            handleSafeClick(e, () => {
              if (item.download?.id) {
                navigate({ to: "/downloads/$id/play", params: { id: item.download.id } });
              }
            })
          }
        >
          <MediaCard media={item} showPreview showPlay showSocial showType={showType} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
