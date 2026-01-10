import z from "zod";

export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

// pagination schema
export const paginationSchema = z.object({
  page: z.string().default("1"),
  limit: z.string().default("20"),
});
