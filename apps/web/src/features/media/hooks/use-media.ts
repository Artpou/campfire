import type { ListMediaQuery } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { useInfiniteQuery, useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { mediaQueries, refetchLibraryInterval, refetchMediaInterval } from "@/features/media/hooks/media.queries";

/** Infinite media list with auto-refetch while any card has an active download. */
export function useMediaList(query: ListMediaQuery) {
  return useInfiniteQuery({
    ...mediaQueries.list(query),
    refetchInterval: refetchMediaInterval,
  });
}

/** Suspense variant — library page and other suspended loaders. */
export function useSuspenseMediaList(query: ListMediaQuery) {
  return useSuspenseInfiniteQuery({
    ...mediaQueries.list(query),
    refetchInterval: refetchMediaInterval,
  });
}

/** Flat “in progress” list with the same active-download refetch strategy. */
export function useMediaInProgress(type: Media["type"]) {
  return useQuery({
    ...mediaQueries.inProgress(type),
    refetchInterval: refetchLibraryInterval,
  });
}
