import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const mediaSessionQueries = {
  key: ["media-session"] as const,
  get: () =>
    queryOptions({
      queryKey: [...mediaSessionQueries.key],
      queryFn: () => unwrap(api.auth["media-session"].$get()),
    }),
};
