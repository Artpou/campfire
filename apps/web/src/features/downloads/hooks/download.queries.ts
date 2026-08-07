import { t } from "@lingui/core/macro";
import type { DownloadTorrentInput } from "@seedarr/contracts";
import type { Download } from "@seedarr/sdk";
import { api, getBaseUrl, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { type QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { translateDownloadError } from "@/features/downloads/helpers/download-error.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

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
      queryFn: () => unwrap(api.downloads[":id"]["remote-files"].$get({ param: { id } })),
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
  fileStatus: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id, "file-status"],
      queryFn: () => unwrap(api.downloads[":id"].fileStatus.$get({ param: { id } })),
      staleTime: 5 * 60_000,
      retry: false,
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

interface DeleteDownloadParams {
  id: string;
  dbOnly?: boolean;
  scope?: "torrent" | "remote" | "all";
  unlink?: boolean;
}

export function useDownloadDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dbOnly, scope, unlink }: DeleteDownloadParams) => {
      const query: Record<string, string> = {};
      if (dbOnly) query.dbOnly = "true";
      if (unlink) query.unlink = "true";
      if (scope && scope !== "all") query.scope = scope;
      return unwrap(api.downloads[":id"].$delete({ param: { id }, query }));
    },
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

export function useDownloadReassignMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mediaId }: { id: string; mediaId: number }) =>
      unwrap(api.downloads[":id"].media.$patch({ param: { id }, json: { mediaId } })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Media reassigned`);
    },
    onError: (error) => {
      toast.error(t`Could not reassign media`, {
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

export function useDownloadRecheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].recheck.$post({ param: { id } })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Recheck started`);
    },
    onError: (error) => {
      toast.error(t`Could not recheck download`, {
        description: translateDownloadError(formatError(error)),
      });
    },
  });
}

export function useDownloadReannounce() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unwrap(api.downloads[":id"].reannounce.$post({ param: { id } })),
    onSuccess: () => {
      invalidateDownloadRelatedQueries(queryClient);
      toast.success(t`Reannounce sent`);
    },
    onError: (error) => {
      toast.error(t`Could not reannounce`, {
        description: formatError(error),
      });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { token } = await unwrap(api.downloads[":id"].fileToken.$post({ param: { id } }));
      const url = `${getBaseUrl()}/download-files/${id}?token=${encodeURIComponent(token)}`;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    },
    onError: (error) => {
      toast.error(t`Could not download file`, {
        description: formatError(error),
      });
    },
  });
}
