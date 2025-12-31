import { useEffect, useMemo } from "react";

import { useIntersectionObserver } from "@uidotdev/usehooks";

import { Skeleton } from "@/shared/ui/skeleton";

import { useMediaStatusBatch } from "@/features/media/hooks/use-media";
import { Media } from "@/features/media/media";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  items: Media[];
  isLoading?: boolean;
  withType?: boolean;
  onLoadMore?: () => void;
}

const MAX_IDS_TO_FETCH = 100;

export function MediaGrid({
  items,
  isLoading = false,
  withType = false,
  onLoadMore,
}: MediaGridProps) {
  const [lastItemRef, entry] = useIntersectionObserver({
    threshold: 1.0,
  });

  const mediaIds = useMemo(() => items.slice(-MAX_IDS_TO_FETCH).map((item) => item.id), [items]);
  const { data: statusMap } = useMediaStatusBatch(mediaIds);

  useEffect(() => {
    if (entry?.isIntersecting && onLoadMore) {
      onLoadMore();
    }
  }, [entry, onLoadMore]);

  if (!items || !items.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {items.map((item, index) => {
        const status = statusMap?.[item.id];
        return (
          <div
            key={`${item.type}-${item.id}`}
            ref={index === items.length - 1 ? lastItemRef : null}
            className="hover:border-primary/50 border-2 border-transparent rounded-xl"
          >
            <MediaCard
              media={item}
              withType={withType}
              isLiked={status?.isLiked}
              isInWatchList={status?.isInWatchList}
            />
          </div>
        );
      })}
      {isLoading &&
        Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-2/3 w-full rounded-md" />
        ))}
    </div>
  );
}
