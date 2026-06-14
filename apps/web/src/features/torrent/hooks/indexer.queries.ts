import { api, unwrap } from "@seedarr/sdk";
import { queryOptions } from "@tanstack/react-query";

export const indexerQueries = {
  key: ["torrent-indexers"] as const,
  list: () =>
    queryOptions({
      queryKey: [...indexerQueries.key],
      queryFn: () => unwrap(api.torrents.indexers.$get()),
      retry: false,
    }),
};
