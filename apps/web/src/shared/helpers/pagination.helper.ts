import { toApiQuery } from "@/shared/helpers/query.helper";

export const toPaginationQuery = <T extends Record<string, unknown>>(
  query: T,
  options: { pageParam?: number; limit?: number },
) => {
  const limitValue = options.limit ?? query.limit ?? 20;
  return toApiQuery(
    { ...query, page: undefined, limit: undefined },
    {
      page: options.pageParam?.toString() ?? "1",
      limit: String(limitValue),
    },
  );
};
