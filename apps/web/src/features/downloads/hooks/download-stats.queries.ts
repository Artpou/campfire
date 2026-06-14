import type { DownloadStats } from "@seedarr/sdk";
import { getBaseUrl, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const downloadStatsQueries = {
  key: ["download-stats"] as const,
  get: () =>
    queryOptions<DownloadStats>({
      queryKey: [...downloadStatsQueries.key],
      queryFn: async () => {
        const res = await fetch(`${getBaseUrl()}/downloads/stats`, {
          credentials: "include",
        });
        return unwrap(Promise.resolve(res));
      },
    }),
};
