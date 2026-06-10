import type { DownloadTorrentInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useStartDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DownloadTorrentInput) =>
      unwrap(
        api.downloads.$post({
          json: input,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torrent-downloads"] });
    },
  });
}

export function useTorrentDownloads() {
  return useQuery({
    queryKey: ["torrent-downloads"],
    queryFn: () => unwrap(api.downloads.$get()),
    refetchInterval: 2000,
  });
}

export function useTorrentDownload(
  id: string,
  { refetchInterval = 0, enabled = true }: { refetchInterval?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["torrent-download", id],
    queryFn: () =>
      unwrap(
        api.downloads[":id"].$get({
          param: { id },
        }),
      ),
    refetchInterval,
    enabled,
  });
}

export function useDeleteTorrent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.downloads[":id"].$delete({
          param: { id },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torrent-downloads"] });
    },
  });
}

export function usePauseTorrent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.downloads[":id"].pause.$post({
          param: { id },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torrent-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["torrent-download"] });
    },
  });
}

export function useResumeTorrent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      unwrap(
        api.downloads[":id"].resume.$post({
          param: { id },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["torrent-downloads"] });
      queryClient.invalidateQueries({ queryKey: ["torrent-download"] });
    },
  });
}
