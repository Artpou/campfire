import type { MediaRequest } from "@seedarr/sdk";

import { InfiniteSentinel } from "@/shared/components/infinite-sentinel";
import { flattenInfiniteResults, type InfiniteResultsQuery } from "@/shared/hooks/use-infinite-list";
import { Skeleton } from "@/shared/ui/skeleton";

import { RequestCard } from "./request-card";

interface RequestGridProps {
  items?: MediaRequest[];
  query?: InfiniteResultsQuery<MediaRequest>;
  isLoading?: boolean;
}

export function RequestGrid({ items, query, isLoading = false }: RequestGridProps) {
  const displayItems = items ?? flattenInfiniteResults(query);
  const showSkeletons = isLoading || (Boolean(query?.isPending) && displayItems.length === 0);

  if (!showSkeletons && displayItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {displayItems.map((item) => (
          <RequestCard key={item.id} request={item} />
        ))}
        {showSkeletons &&
          Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={`skeleton-${i.toString()}`} className="h-24 w-full rounded-lg" />
          ))}
      </div>
      <InfiniteSentinel query={query} />
    </div>
  );
}
