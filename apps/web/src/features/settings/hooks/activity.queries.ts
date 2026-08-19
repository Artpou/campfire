import type { ActivityCategory, ActivityType } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const activityQueries = {
  key: ["activity"] as const,
  list: (params: { limit?: number; type?: ActivityType; category?: ActivityCategory; q?: string } = {}) => {
    const { limit = 50, type, category, q } = params;
    return queryOptions({
      queryKey: [...activityQueries.key, { limit, type, category, q }],
      queryFn: () =>
        unwrap(
          api.activity.$get({
            query: {
              limit: String(limit),
              ...(type ? { type } : {}),
              ...(category ? { category } : {}),
              ...(q ? { q } : {}),
            },
          }),
        ),
    });
  },
};
