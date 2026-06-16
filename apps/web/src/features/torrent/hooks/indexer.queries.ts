import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

const QUERY_KEY = { INDEXER_MANAGERS: ["indexer-managers"] as const };

export const indexerManagerQueries = {
  key: QUERY_KEY.INDEXER_MANAGERS,
  list: () =>
    queryOptions({
      queryKey: [...indexerManagerQueries.key],
      queryFn: () => unwrap(api["indexer-manager"].$get()),
    }),
};

export const indexerQueries = {
  key: ["torrent-indexers"] as const,
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
