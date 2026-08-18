import { type InfiniteResultsQuery, useInfiniteSentinel } from "@/shared/hooks/use-infinite-list";

export function InfiniteSentinel<T>({ query }: { query?: InfiniteResultsQuery<T> }) {
  const { sentinelRef } = useInfiniteSentinel(query);

  if (!query?.hasNextPage) return null;
  return <div ref={sentinelRef} className="h-4" aria-hidden />;
}
