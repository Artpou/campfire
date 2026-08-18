import { useEffect } from "react";

import { useIntersectionObserver } from "@uidotdev/usehooks";

export type InfiniteResultsQuery<T> = {
  data?: { pages: Array<{ results: T[] }> };
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isPending: boolean;
};

export function flattenInfiniteResults<T>(query?: InfiniteResultsQuery<T>): T[] {
  return query?.data?.pages.flatMap((page) => page.results) ?? [];
}

export function useInfiniteSentinel<T>(query?: InfiniteResultsQuery<T>) {
  const [sentinelRef, entry] = useIntersectionObserver({
    threshold: 0,
    rootMargin: "0px 0px 300px 0px",
  });

  const fetchNextPage = query?.fetchNextPage;
  const hasNextPage = query?.hasNextPage;
  const isFetchingNextPage = query?.isFetchingNextPage;

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage?.();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage]);

  return { sentinelRef };
}
