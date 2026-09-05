import { useState } from "react";

/**
 * Page state that resets to `initialPage` whenever `filters` change identity.
 * Uses the React “adjust state during render” pattern — no useEffect / biome-ignore.
 *
 * @example
 * const filters = { q: debouncedQuery, category };
 * const { page, setPage } = usePagedState(filters);
 */
export function usePagedState<F>(filters: F, initialPage = 1): { page: number; setPage: (page: number) => void } {
  const filterKey = JSON.stringify(filters);
  const [page, setPage] = useState(initialPage);
  const [prevKey, setPrevKey] = useState(filterKey);

  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(initialPage);
  }

  return { page, setPage };
}
