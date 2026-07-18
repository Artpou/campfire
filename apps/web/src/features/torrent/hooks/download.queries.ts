import { t } from "@lingui/core/macro";
import type { Download, DownloadTorrentInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { type QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { translateDownloadError } from "@/features/downloads/helpers/download-error.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";

export const downloadQueries = {
  key: ["download"] as const,
  details: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id],
      queryFn: () => unwrap(api.downloads[":id"].$get({ param: { id } })),
    }),
  byMedia: (mediaId: number) =>
    queryOptions({
      queryKey: [...downloadQueries.key, "by-media", mediaId],
      queryFn: () =>
        unwrap(
          api.downloads["by-media"][":mediaId"].$get({
            param: { mediaId: mediaId.toString() },
          }),
        ),
      refetchInterval: ({ state }) => refetchDownloadsByMediaInterval({ state }),
    }),
};

export function refetchDownloadInterval({ state }: { state: QueryState<Download> }) {
  const data = state.data;
  if (!data) return false;
  if (data.torrent?.transferring) return 1500;
  return data.torrent?.done ? false : 1500;
}

function refetchDownloadsByMediaInterval({ state }: { state: QueryState<Download[]> }) {
  const downloads = state.data;
  if (!downloads?.length) return false;

  const hasActiveDownload = downloads.some(
    (download) => download.torrent?.transferring || (download.torrent && !download.torrent.done),
  );

  return hasActiveDownload ? 5000 : false;
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
      toast.success(t`Download deleted`);
    },
    onError: (error) => {
      toast.error(t`Could not delete download`, {
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
      toast.success(t`Download paused`);
    },
    onError: (error) => {
      toast.error(t`Could not pause download`, {
        description: error instanceof Error ? translateDownloadError(error.message) : undefined,
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
      toast.success(t`Download resumed`);
    },
    onError: (error) => {
      toast.error(t`Could not resume download`, {
        description: error instanceof Error ? translateDownloadError(error.message) : undefined,
      });
    },
  });
}

export function useDownloadTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].transfer.$post({ param: { id } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: downloadQueries.key });
    },
    onError: (error) => {
      toast.error(t`Could not transfer to remote server`, {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}
