import { t } from "@lingui/core/macro";
import type { UpsertStorageConfigInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const storageConfigQueries = {
  key: ["storage-config"] as const,
  get: () =>
    queryOptions({
      queryKey: [...storageConfigQueries.key],
      queryFn: () => unwrap(api["storage-config"].$get()),
    }),
  /** Lightweight flag for members (transfer button). No host/credentials. */
  enabled: () =>
    queryOptions({
      queryKey: [...storageConfigQueries.key, "enabled"] as const,
      queryFn: () => unwrap(api["storage-config"].enabled.$get()),
    }),
};

export type TestStorageConnectionInput = {
  protocol: "ftp" | "webdav";
  host: string;
  port: number;
  secure?: boolean;
  username?: string;
  password?: string;
};

export function useUpsertStorageConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertStorageConfigInput) => unwrap(api["storage-config"].$put({ json: input })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageConfigQueries.key });
      queryClient.invalidateQueries({ queryKey: [...storageConfigQueries.key, "enabled"] });
      toast.success(t`Storage configuration saved`);
    },
    onError: (error) => {
      toast.error(t`Failed to save storage configuration`, {
        description: formatError(error),
      });
    },
  });
}

export function useTestStorageConnection() {
  return useMutation({
    mutationFn: (input: TestStorageConnectionInput) => unwrap(api["storage-config"].test.$post({ json: input })),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t`Remote server is connected and available`);
      } else {
        toast.error(t`Remote server is unreachable`, {
          description: result.error,
        });
      }
    },
    onError: (error) => {
      toast.error(t`Remote server is unreachable`, {
        description: formatError(error),
      });
    },
  });
}
