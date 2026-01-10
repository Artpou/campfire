import type { Context } from "hono";

import type { Paginate, PaginationParams } from "./pagination.dto";

export function paginationParams(c: Context): PaginationParams {
  const page = c.req.query("page");
  const limit = c.req.query("limit");

  const parsedPage = page ? Number(page) : 1;
  const parsedLimit = limit ? Number(limit) : 20;

  return {
    page: parsedPage,
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
  };
}

export function toPaginate<T>(items: T[], page: number, limit: number): Paginate<T> {
  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;

  return {
    results,
    page,
    hasMore,
  };
}
