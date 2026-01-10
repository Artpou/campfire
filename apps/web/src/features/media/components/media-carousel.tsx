import { ReactNode, useMemo } from "react";

import type { Media } from "@basement/api/types";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCard } from "@/features/media/components/media-card";

const MAX_ITEMS = 20;
interface MediaCarouselProps {
  title: string | ReactNode;
  data: Media[];
}

export function MediaCarousel({ title, data }: MediaCarouselProps) {
  const displayedData = useMemo(() => data.slice(0, MAX_ITEMS), [data]);

  if (!data || data.length === 0) return null;

  return (
    <CarouselWrapper title={title}>
      {displayedData.map((item, index) => (
        <CarouselItem key={item.id || index}>
          <MediaCard media={item} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
