import { z } from "zod";

export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
  /** Total matching rows when the API provides a count. */
  total?: number;
}

export const paginationDto = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  ids: z
    .string()
    .max(4096)
    .transform((val) => val.split(","))
    .optional(),
});
export type PaginationQuery = z.infer<typeof paginationDto>;

/** Number of pages for a paginated list (at least 1). */
export function pageCount(total: number, limit: number): number {
  if (limit <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}
