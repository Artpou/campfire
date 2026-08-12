import { useEffect, useRef } from "react";

import type { MediaRequest } from "@seedarr/sdk";
import { useIntersectionObserver } from "@uidotdev/usehooks";

import { Skeleton } from "@/shared/ui/skeleton";

import { RequestCard } from "./request-card";

interface RequestGridProps {
  items: MediaRequest[];
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export function RequestGrid({ items, isLoading = false, onLoadMore }: RequestGridProps) {
  const [lastItemRef, entry] = useIntersectionObserver({ threshold: 1.0 });

  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (entry?.isIntersecting && !isLoading && onLoadMoreRef.current) {
      onLoadMoreRef.current();
    }
  }, [entry?.isIntersecting, isLoading]);

  if (!isLoading && (!items || !items.length)) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((item, index) => (
        <div key={item.id} ref={index === items.length - 1 ? lastItemRef : null}>
          <RequestCard request={item} />
        </div>
      ))}
      {isLoading &&
        Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`skeleton-${i.toString()}`} className="h-24 w-full rounded-lg" />
        ))}
    </div>
  );
}
