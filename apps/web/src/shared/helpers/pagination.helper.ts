import { toApiQuery } from "@/shared/helpers/query.helper";

export const toPaginationQuery = <T extends Record<string, unknown>>(
  query: T,
  options: { pageParam?: number; limit?: number },
) => {
  return toApiQuery(query, {
    page: options.pageParam?.toString() ?? "1",
    limit: options.limit?.toString() ?? "20",
  });
};
