import type { PaginationQuery } from "@seedarr/contracts";

export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
  /** Total matching rows when the API provides a count. */
  total?: number;
}

export const paginate = (query?: Partial<PaginationQuery>) => {
  if (!query?.page || !query?.limit)
    return {
      offset: 0,
      limit: 0,
    };

  return {
    offset: (query.page - 1) * query.limit,
    limit: query.limit + 1,
  };
};

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
