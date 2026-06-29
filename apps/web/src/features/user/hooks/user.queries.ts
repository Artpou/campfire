import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const userQueries = {
  key: ["users"] as const,
  list: () =>
    queryOptions({
      queryKey: [...userQueries.key],
      queryFn: () => unwrap(api.users.$get()),
    }),
};
