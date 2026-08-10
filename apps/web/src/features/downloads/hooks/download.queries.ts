import { t } from "@lingui/core/macro";
import type { DownloadTorrentInput } from "@seedarr/contracts";
import type { Download, Media } from "@seedarr/sdk";
import { api, getBaseUrl, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { type QueryState, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import ms from "ms";
import { toast } from "sonner";

import { translateDownloadError } from "@/features/downloads/helpers/download-error.helper";
import { hasFiles } from "@/features/downloads/helpers/downloads.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

function invalidateDownloadRelatedQueries(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: downloadQueries.key });
  queryClient.invalidateQueries({ queryKey: mediaQueries.key });
  // Movie/TV detail pages cache media.download separately — keep Play in sync.
  queryClient.invalidateQueries({ queryKey: ["movie-full"] });
  queryClient.invalidateQueries({ queryKey: tvQueries.key });
}

function refetchDownloadsByMediaInterval({ state }: { state: QueryState<Download[]> }) {
  const downloads = state.data;
  if (!downloads?.length) return false;

  const hasActiveDownload = downloads.some(
    (download) => download.torrent?.transferring || (download.torrent && !download.torrent.done),
  );

  return hasActiveDownload ? 2000 : false;
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
      staleTime: ms("5m"),
    }),
  remoteFiles: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id, "remote-files"],
      queryFn: () => unwrap(api.downloads[":id"]["remote-files"].$get({ param: { id } })),
    }),
  byMedia: (media: Media) =>
    queryOptions({
      queryKey: [...downloadQueries.key, "by-media", media.id],
      queryFn: () =>
        unwrap(
          api.downloads["by-media"][":mediaId"].$get({
            param: { mediaId: String(media.id) },
          }),
        ),
      refetchInterval: ({ state }) => refetchDownloadsByMediaInterval({ state }),
      enabled: hasFiles(media.download),
    }),
  videoFile: (id: string) =>
    queryOptions({
      queryKey: [...downloadQueries.key, id, "video-file"],
      queryFn: () =>
        unwrap(api.downloads[":id"]["video-file"].$get({ param: { id } })).catch(() => {
          toast.error(t`Video file not available`, { description: t`The video file is no longer accessible.` });
        }),
      staleTime: 5 * 60_000,
      retry: false,
    }),
  stats: () =>
    queryOptions({
      queryKey: [...downloadQueries.key, "stats"],
      queryFn: () => unwrap(api.downloads.stats.$get()),
    }),
};

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

function createDownloadActionMutation<TVariables>(options: {
  mutationFn: (variables: TVariables) => Promise<unknown>;
  successMsg: () => string;
  errorMsg: () => string;
  translateError?: boolean;
}) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: options.mutationFn,
      onSuccess: () => {
        invalidateDownloadRelatedQueries(queryClient);
        toast.success(options.successMsg());
      },
      onError: (error) => {
        const description = options.translateError ? translateDownloadError(formatError(error)) : formatError(error);
        toast.error(options.errorMsg(), { description });
      },
    });
  };
}

export const useDownloadDelete = createDownloadActionMutation<DeleteDownloadParams>({
  mutationFn: ({ id, dbOnly, scope, unlink }) => {
    const query: Record<string, string> = {};
    if (dbOnly) query.dbOnly = "true";
    if (unlink) query.unlink = "true";
    if (scope && scope !== "all") query.scope = scope;
    return unwrap(api.downloads[":id"].$delete({ param: { id }, query }));
  },
  successMsg: () => t`Download deleted`,
  errorMsg: () => t`Could not delete download`,
});

interface BatchDeleteParams {
  ids: string[];
  dbOnly?: boolean;
}

export const useBatchDeleteDownloads = createDownloadActionMutation<BatchDeleteParams>({
  mutationFn: ({ ids, dbOnly }) => unwrap(api.downloads["batch-delete"].$post({ json: { ids, dbOnly } })),
  successMsg: () => t`Downloads deleted`,
  errorMsg: () => t`Could not delete downloads`,
});

export const useDownloadReassignMedia = createDownloadActionMutation<{ id: string; mediaId: number }>({
  mutationFn: ({ id, mediaId }) => unwrap(api.downloads[":id"].media.$patch({ param: { id }, json: { mediaId } })),
  successMsg: () => t`Media reassigned`,
  errorMsg: () => t`Could not reassign media`,
});

export const useDownloadPause = createDownloadActionMutation<string>({
  mutationFn: (id) => unwrap(api.downloads[":id"].pause.$post({ param: { id } })),
  successMsg: () => t`Download paused`,
  errorMsg: () => t`Could not pause download`,
  translateError: true,
});

export const useDownloadResume = createDownloadActionMutation<string>({
  mutationFn: (id) => unwrap(api.downloads[":id"].resume.$post({ param: { id } })),
  successMsg: () => t`Download resumed`,
  errorMsg: () => t`Could not resume download`,
  translateError: true,
});

export const useDownloadRecheck = createDownloadActionMutation<string>({
  mutationFn: (id) => unwrap(api.downloads[":id"].recheck.$post({ param: { id } })),
  successMsg: () => t`Recheck started`,
  errorMsg: () => t`Could not recheck download`,
  translateError: true,
});

export const useDownloadReannounce = createDownloadActionMutation<string>({
  mutationFn: (id) => unwrap(api.downloads[":id"].reannounce.$post({ param: { id } })),
  successMsg: () => t`Reannounce sent`,
  errorMsg: () => t`Could not reannounce`,
});

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
