import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export function useIndexers() {
  return useQuery({
    queryKey: ["torrent-indexers"],
    queryFn: () => unwrap(api.torrents.indexers.$get()),
    retry: false,
  });
}
