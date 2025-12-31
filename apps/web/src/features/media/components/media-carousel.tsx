import { ReactNode, useMemo } from "react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { MediaCard } from "@/features/media/components/media-card";
import { useMediaStatusBatch } from "@/features/media/hooks/use-media";
import { Media } from "@/features/media/media";

const MAX_ITEMS = 20;
interface MediaCarouselProps {
  title: string | ReactNode;
  data: Media[];
}

export function MediaCarousel({ title, data }: MediaCarouselProps) {
  const displayedData = useMemo(() => data.slice(0, MAX_ITEMS), [data]);
  const mediaIds = useMemo(() => displayedData.map((item) => item.id), [displayedData]);
  const { data: statusMap } = useMediaStatusBatch(mediaIds);

  if (!data || data.length === 0) return null;

  return (
    <CarouselWrapper title={title}>
      {displayedData.map((item, index) => {
        const status = statusMap?.[item.id];
        return (
          <CarouselItem key={item.id || index}>
            <MediaCard
              media={item}
              isLiked={status?.isLiked}
              isInWatchList={status?.isInWatchList}
            />
          </CarouselItem>
        );
      })}
    </CarouselWrapper>
  );
}
