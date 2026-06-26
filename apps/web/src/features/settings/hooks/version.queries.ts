import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";
import ms from "ms";

export const versionQueries = {
  key: ["version"] as const,
  get: () =>
    queryOptions({
      queryKey: [...versionQueries.key],
      queryFn: () => unwrap(api.version.$get()),
      staleTime: ms("1h"),
    }),
};
