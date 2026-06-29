import type { Download, DownloadTorrentInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { type QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    mutationFn: (input: DownloadTorrentInput) => unwrap(api.downloads.$post({ json: input })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
    },
  });
}

export function useDownloadDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success("Download deleted");
    },
    onError: (error) => {
      toast.error("Could not delete download", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}

export function useDownloadPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].pause.$post({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success("Download paused");
    },
    onError: (error) => {
      toast.error("Could not pause download", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}

export function useDownloadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].resume.$post({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success("Download resumed");
    },
    onError: (error) => {
      toast.error("Could not resume download", {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}
