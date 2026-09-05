import { t } from "@lingui/core/macro";
import type { ManualSyncInput } from "@seedarr/contracts";
import type { RemoteSyncResult } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { movieQueries } from "@/features/movies/hooks/movie.queries";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

type RemoteSyncError = RemoteSyncResult["errors"][number];

function invalidateAfterRemoteSync(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: downloadQueries.key });
  queryClient.invalidateQueries({ queryKey: mediaQueries.key });
  queryClient.invalidateQueries({ queryKey: movieQueries.key });
  queryClient.invalidateQueries({ queryKey: tvQueries.key });
}

export function useRemoteSync(onUnmatched?: (files: RemoteSyncError[]) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.modules.storage.sync.$post()),
    onSuccess: (data) => {
      invalidateAfterRemoteSync(queryClient);
      if (data.errors.length > 0) {
        onUnmatched?.(data.errors);
        toast.warning(t`Remote sync finished with unmatched files`, {
          description: t`${data.synced} synced, ${data.errors.length} need manual matching`,
        });
        return;
      }
      toast.success(t`Remote sync finished`, { description: t`${data.synced} files synced` });
    },
    onError: (error) => toast.error(t`Remote sync failed`, { description: formatError(error) }),
  });
}

export function useManualSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualSyncInput) => unwrap(api.modules.storage["sync-manual"].$post({ json: input })),
    onSuccess: () => invalidateAfterRemoteSync(queryClient),
    onError: (error) => toast.error(t`Manual sync failed`, { description: formatError(error) }),
  });
}
