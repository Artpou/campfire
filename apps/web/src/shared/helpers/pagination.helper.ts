export const toPaginationQuery = <T extends Record<string, unknown>>(
  query: T,
  options: { pageParam?: number; limit?: number },
) => {
  const result: Record<string, string> = {
    page: options.pageParam?.toString() ?? "1",
    limit: options.limit?.toString() ?? "20",
  };

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || key === "page" || key === "limit") continue;
    result[key] = Array.isArray(value) ? value.join(",") : String(value);
  }

  return result;
};
