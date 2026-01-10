import { useEffect } from "react";

import type { Media } from "@basement/api/types";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { Skeleton } from "@/shared/ui/skeleton";

import { useMediasStatus } from "@/features/media/hooks/use-media";
import { MediaCard } from "./media-card";

interface MediaGridProps {
  items: Media[];
  isLoading?: boolean;
  withType?: boolean;
  withLoading?: boolean;
  onLoadMore?: () => void;
}

export function MediaGrid({
  items,
  isLoading = false,
  withType = false,
  withLoading = true,
  onLoadMore,
}: MediaGridProps) {
  const { data: statuses } = useMediasStatus(items.map((item) => item.id.toString()));
  const [lastItemRef, entry] = useIntersectionObserver({
    threshold: 1.0,
  });

  useEffect(() => {
    if (entry?.isIntersecting && onLoadMore) {
      onLoadMore();
    }
  }, [entry, onLoadMore]);

  if (!isLoading && (!items || !items.length)) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
      {items.map((item, index) => (
        <div
          key={`${item.type}-${item.id}`}
          ref={index === items.length - 1 ? lastItemRef : null}
          className="hover:border-primary/50 border-2 border-transparent rounded-xl"
        >
          <MediaCard
            media={{ ...item, ...statuses?.find((status) => status.id === item.id) }}
            withType={withType}
          />
        </div>
      ))}
      {withLoading &&
        isLoading &&
        Array.from({ length: 20 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="aspect-2/3 w-full rounded-md" />
        ))}
    </div>
  );
}
