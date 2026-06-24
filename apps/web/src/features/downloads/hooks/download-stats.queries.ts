import type { DownloadStats } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const downloadStatsQueries = {
  key: ["download-stats"] as const,
  get: () =>
    queryOptions<DownloadStats>({
      queryKey: [...downloadStatsQueries.key],
      queryFn: () => unwrap(api.downloads.stats.$get()),
    }),
};
