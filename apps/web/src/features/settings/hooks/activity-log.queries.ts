import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const activityLogQueries = {
  key: ["activity-logs"] as const,
  list: (limit = "50") =>
    queryOptions({
      queryKey: [...activityLogQueries.key, limit],
      queryFn: () => unwrap(api["activity-logs"].$get({ query: { limit } })),
    }),
};
