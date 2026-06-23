import z from "zod";

export interface Paginate<T> {
  results: T[];
  page: number;
  hasMore: boolean;
}

// pagination schema
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
