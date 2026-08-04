import { t } from "@lingui/core/macro";
import type { Download, DownloadTorrentInput, TorrentInspectFile } from "@seedarr/sdk";
import { ApiError, api, getBaseUrl, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { type QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { translateDownloadError } from "@/features/downloads/helpers/download-error.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

async function fetchRemoteFiles(id: string): Promise<TorrentInspectFile[]> {
  const res = await fetch(`${getBaseUrl()}/downloads/${id}/remote-files`, { credentials: "include" });
  if (!res.ok) throw new ApiError(`Failed to fetch remote files: ${res.status}`, res.status);
  return res.json();
}

function invalidateDownloadRelatedQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: downloadQueries.key });
  queryClient.invalidateQueries({ queryKey: mediaQueries.key });
  // Movie/TV detail pages cache media.download separately — keep Play in sync.
  queryClient.invalidateQueries({ queryKey: ["movie-full"] });
  queryClient.invalidateQueries({ queryKey: tvQueries.key });
}

export const downloadQueries = {
  key: ["download"] as const,
  details: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id],
      queryFn: () => unwrap(api.downloads[":id"].$get({ param: { id } })),
    }),
  playbackInfo: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id, "playback-info"],
      queryFn: () => unwrap(api.streaming[":id"].info.$get({ param: { id } })),
    }),
  remoteFiles: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id, "remote-files"],
      queryFn: () => fetchRemoteFiles(id),
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
  if (data.torrent?.transferring) return 1000;
  return data.torrent?.done ? false : 1000;
}

function refetchDownloadsByMediaInterval({ state }: { state: QueryState<Download[]> }) {
  const downloads = state.data;
  if (!downloads?.length) return false;

  const hasActiveDownload = downloads.some(
    (download) => download.torrent?.transferring || (download.torrent && !download.torrent.done),
  );

  return hasActiveDownload ? 2000 : false;
}

export function useStartDownload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DownloadTorrentInput) => unwrap(api.downloads.$post({ json: input })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
    },
  });
}

export function useDownloadDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dbOnly }: { id: string; dbOnly?: boolean }) =>
      unwrap(api.downloads[":id"].$delete({ param: { id }, query: dbOnly ? { dbOnly: "true" } : {} })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Download deleted`);
    },
    onError: (error) => {
      toast.error(t`Could not delete download`, {
        description: formatError(error),
      });
    },
  });
}

export function useDownloadPause() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].pause.$post({ param: { id } })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Download paused`);
    },
    onError: (error) => {
      toast.error(t`Could not pause download`, {
        description: translateDownloadError(formatError(error)),
      });
    },
  });
}

export function useDownloadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].resume.$post({ param: { id } })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Download resumed`);
    },
    onError: (error) => {
      toast.error(t`Could not resume download`, {
        description: translateDownloadError(formatError(error)),
      });
    },
  });
}
