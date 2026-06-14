import { useEffect, useRef } from "react";

import type { Media } from "@seedarr/sdk";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { Skeleton } from "@/shared/ui/skeleton";

import { MediaCard } from "./media-card";

interface MediaGridProps {
  items: Media[];
  isLoading?: boolean;
  withLoading?: boolean;
  search?: boolean;
  onLoadMore?: () => void;
}

export function MediaGrid({ items, isLoading = false, withLoading = true, search, onLoadMore }: MediaGridProps) {
  const [lastItemRef, entry] = useIntersectionObserver({
    threshold: 1.0,
  });

  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (entry?.isIntersecting && !isLoading && onLoadMoreRef.current) {
      onLoadMoreRef.current();
    }
  }, [entry?.isIntersecting, isLoading]);

  if (!isLoading && (!items || !items.length)) return null;

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-4">
      {items.map((item, index) => (
        <div key={`${item.type}-${item.id}`} ref={index === items.length - 1 ? lastItemRef : null} className="relative">
          <MediaCard media={item} mode="preview" withType={search} />
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
