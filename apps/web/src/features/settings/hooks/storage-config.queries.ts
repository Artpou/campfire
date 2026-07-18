import { t } from "@lingui/core/macro";
import type { UpsertStorageConfigInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const storageConfigQueries = {
  key: ["storage-config"] as const,
  get: () =>
    queryOptions({
      queryKey: [...storageConfigQueries.key],
      queryFn: () => unwrap(api["storage-config"].$get()),
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
      toast.success(t`Storage configuration saved`);
    },
    onError: (error) => {
      toast.error(t`Failed to save storage configuration`, {
        description: error instanceof Error ? error.message : undefined,
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
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });
}
