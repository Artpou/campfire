import { type ReactNode, useMemo } from "react";

import type { Media } from "@seedarr/sdk";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCard } from "@/features/media/components/card/media-card";

const MAX_ITEMS = 20;
interface MediaCarouselProps {
  title: string | ReactNode;
  data: Media[];
  seeMoreTo?: string;
}

export function MediaCarousel({ title, data, seeMoreTo }: MediaCarouselProps) {
  const displayedData = useMemo(() => data.slice(0, MAX_ITEMS), [data]);

  if (!data || data.length === 0) return null;

  return (
    <CarouselWrapper title={title} seeMoreTo={seeMoreTo}>
      {displayedData.map((item, index) => (
        <CarouselItem key={item.id || index}>
          <MediaCard media={item} withPreview />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
