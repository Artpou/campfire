import type { ManualSyncInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const remoteSyncQueries = {
  key: ["modules", "storage", "sync"] as const,
};

type RemoteSyncError = {
  name: string;
  path: string;
  type: "movie" | "tv";
};

type RemoteSyncResponse = {
  synced: number;
  skipped: number;
  errors: RemoteSyncError[];
};

export function useRemoteSync(onUnmatched?: (files: RemoteSyncError[]) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.modules.storage.sync.$post()) as Promise<RemoteSyncResponse>,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: remoteSyncQueries.key });
      if (data.errors.length > 0) {
        onUnmatched?.(data.errors);
        toast.warning("Remote sync finished with unmatched files", {
          description: `${data.synced} synced, ${data.errors.length} need manual matching`,
        });
        return;
      }
      toast.success("Remote sync finished", { description: `${data.synced} files synced` });
    },
    onError: (error) => toast.error("Remote sync failed", { description: formatError(error) }),
  });
}

export function useManualSync() {
  return useMutation({
    mutationFn: (input: ManualSyncInput) => unwrap(api.modules.storage["sync-manual"].$post({ json: input })),
  });
}
