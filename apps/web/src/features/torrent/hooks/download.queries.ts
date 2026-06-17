import type { Download, DownloadTorrentInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";

import { mediaQueries } from "@/features/media/hooks/media.queries";

export const downloadQueries = {
  key: ["download"] as const,
  details: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id],
      queryFn: () => unwrap(api.downloads[":id"].$get({ param: { id } })),
    }),
};

export function refetchDownloadInterval({ state }: { state: QueryState<Download> }) {
  const data = state.data;
  if (!data) return false;

  return data.torrent?.done ? false : 1500;
}

export function useStartDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DownloadTorrentInput) => api.downloads.$post({ json: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
    },
  });
}
export function useDownloadDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.downloads[":id"].$delete({ param: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
    },
  });
}
export function useDownloadPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.downloads[":id"].pause.$post({ param: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
    },
  });
}
export function useDownloadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.downloads[":id"].resume.$post({ param: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
    },
  });
}
