import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const indexerManagerQueries = {
  key: ["indexer-manager"] as const,
  list: () =>
    queryOptions({
      queryKey: [...indexerManagerQueries.key],
      queryFn: () => unwrap(api["indexer-manager"].$get()),
    }),
  count: () =>
    queryOptions({
      queryKey: [...indexerManagerQueries.key, "count"],
      queryFn: () => unwrap(api["indexer-manager"].count.$get()),
    }),
};

export const indexerQueries = {
  key: [...indexerManagerQueries.key, "indexers"],
  list: ({ withDisabled }: { withDisabled?: boolean } = { withDisabled: true }) =>
    queryOptions({
      queryKey: [...indexerQueries.key, withDisabled],
      queryFn: async () => {
        const data = await unwrap(api["indexer-manager"].$get());
        if (withDisabled) return data;
        return data.filter((indexer) => !indexer.disabled);
      },
    }),
};
