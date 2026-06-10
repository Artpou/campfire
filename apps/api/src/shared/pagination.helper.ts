import type { Context } from "hono";

import type { Paginate, PaginationQuery } from "./pagination.dto";

export function paginationParams(c: Context): PaginationQuery {
  const page = c.req.query("page");
  const limit = c.req.query("limit");

  const parsedPage = page ? Number(page) : 1;
  const parsedLimit = limit ? Number(limit) : 20;

  return {
    page: parsedPage,
    limit: parsedLimit,
  };
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

export function toPaginate<T>(items: T[], pagination: PaginationQuery): Paginate<T> {
  const hasMore = items.length > (pagination.limit ?? 0);
  const results = hasMore ? items.slice(0, pagination.limit) : items;

  return {
    results,
    page: pagination.page ?? 1,
    hasMore,
  };
}
