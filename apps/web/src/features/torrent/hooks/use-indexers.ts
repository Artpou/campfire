import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

export function useIndexers() {
  return useQuery({
    queryKey: ["torrent-indexers"],
    queryFn: () => unwrap(api.torrents.indexers.$get()),
    retry: false,
  });
}
