import type { PaginationQuery } from "@seedarr/contracts";

export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
  /** Total matching rows when the API provides a count. */
  total?: number;
}

export type PageBounds = {
  page: number;
  limit: number;
  offset: number;
};

/** Resolve page/limit/offset with defaults (exact limit — use with `listPage`). */
export function pageBounds(query?: Partial<PaginationQuery>): PageBounds {
  const page = query?.page ?? 1;
  const limit = query?.limit ?? 20;
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

/**
 * Offset/limit for cursor-style lists that detect `hasMore` via limit+1 (no total).
 * Prefer `listPage` when a COUNT is available.
 */
export const paginate = (query?: Partial<PaginationQuery>) => {
  if (!query?.page || !query?.limit) {
    return { offset: 0, limit: 0 };
  }

  return {
    offset: (query.page - 1) * query.limit,
    limit: query.limit + 1,
  };
};

/** Build a page from a limit+1 fetch (infinite scroll / no COUNT). */
export function toPaginate<T>(items: T[], pagination: PaginationQuery, total?: number): Paginate<T> {
  const hasMore = items.length > (pagination.limit ?? 0);
  const results = hasMore ? items.slice(0, pagination.limit) : items;

  return {
    results,
    page: pagination.page ?? 1,
    hasMore,
    ...(total != null ? { total } : {}),
  };
}

export type ListPageFetch<T> = (opts: { limit: number; offset: number }) => Promise<T[]>;

/**
 * Standard DB page with total count. Exact `limit` (no +1).
 * Reuse from any service: `return listPage(query, repo.findPage, repo.count)`.
 */
export async function listPage<T>(
  query: Partial<PaginationQuery>,
  fetch: ListPageFetch<T>,
  count: () => Promise<number>,
): Promise<Paginate<T>> {
  const { page, limit, offset } = pageBounds(query);
  const [results, total] = await Promise.all([fetch({ limit, offset }), count()]);
  return {
    results,
    page,
    total,
    hasMore: offset + results.length < total,
  };
}
