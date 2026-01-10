import { useMemo } from "react";

import type { Paginate } from "@basement/api/types";
import {
  type InfiniteData,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query";

export function useInfiniteQueryApi<T>(
  options: Omit<
    UseInfiniteQueryOptions<Paginate<T>, Error, InfiniteData<Paginate<T>>, unknown[], number>,
    "getNextPageParam" | "initialPageParam"
  >,
) {
  const query = useInfiniteQuery({
    ...options,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
  });

  const results = useMemo(
    () => query.data?.pages.flatMap((page) => page.results) ?? [],
    [query.data],
  );

  return { ...query, results };
}
