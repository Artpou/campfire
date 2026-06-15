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
  list: () =>
    queryOptions({
      queryKey: [...indexerQueries.key],
      queryFn: () => unwrap(api.torrents.indexers.$get()),
      retry: false,
    }),
};
