export const toPaginationQuery = <T>(
  query: T,
  options: { pageParam?: number; limit?: number },
): T & { page: string; limit: string } => {
  return {
    ...query,
    page: options.pageParam?.toString() ?? "1",
    limit: options.limit?.toString() ?? "20",
  };
};
