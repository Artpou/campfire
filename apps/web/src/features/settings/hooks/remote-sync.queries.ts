import { t } from "@lingui/core/macro";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

export function useRemoteSync(onUnmatchedFiles?: (files: SyncError[]) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => unwrap(api["storage-config"].sync.$post()),
    onSuccess: (result) => {
      if (result.synced > 0) {
        toast.success(t`Synchronization complete`, {
          description: t`${result.synced} media synced, ${result.skipped} skipped`,
        });
      } else if (result.skipped > 0) {
        toast.info(t`Nothing new to sync`, {
          description: t`${result.skipped} media already up to date`,
        });
      } else {
        toast.info(t`No media found on remote server`);
      }

      if (result.errors.length > 0) {
        const errorNames = result.errors.map((e) => e.name);
        const errorList = errorNames.slice(0, 10).join(", ");
        const suffix = errorNames.length > 10 ? t` and ${errorNames.length - 10} more` : "";
        toast.error(t`Could not detect ${result.errors.length} items`, {
          description: `${errorList}${suffix}`,
          duration: 15000,
          action: onUnmatchedFiles
            ? {
                label: t`Manual sync`,
                onClick: () => onUnmatchedFiles(result.errors),
              }
            : undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error) => {
      toast.error(t`Synchronization failed`, {
        description: formatError(error),
      });
    },
  });
}

export function useManualSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { remotePath: string; mediaId: number; type: "movie" | "tv" }) =>
      unwrap(api["storage-config"]["sync-manual"].$post({ json: input })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["downloads"] });
      queryClient.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (error) => {
      toast.error(t`Manual sync failed`, {
        description: formatError(error),
      });
    },
  });
}
