import type { ActivityCategory, ActivityType } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const activityQueries = {
  key: ["activity"] as const,
  list: (
    params: { page?: number; limit?: number; type?: ActivityType; category?: ActivityCategory; q?: string } = {},
  ) => {
    const { page = 1, limit = 20, type, category, q } = params;
    return queryOptions({
      queryKey: [...activityQueries.key, { page, limit, type, category, q }],
      queryFn: () =>
        unwrap(
          api.activity.$get({
            query: {
              page: String(page),
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
