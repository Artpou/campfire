import { ReactNode } from "react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCard } from "@/features/media/components/media-card";
import { Media } from "@/features/media/hooks/use-media";

const MAX_ITEMS = 20;
interface MediaCarouselProps {
  title: string | ReactNode;
  data: Media[];
}

export function MediaCarousel({ title, data }: MediaCarouselProps) {
  if (!data || data.length === 0) return null;

  return (
    <CarouselWrapper title={title}>
      {data.slice(0, MAX_ITEMS).map((item, index) => (
        <CarouselItem key={item.id || index}>
          <MediaCard media={item} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
