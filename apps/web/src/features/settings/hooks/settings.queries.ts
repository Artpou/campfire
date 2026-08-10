import { t } from "@lingui/core/macro";
import type { UpsertSettingsInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const settingsQueries = {
  key: ["settings"] as const,
  get: () =>
    queryOptions({
      queryKey: [...settingsQueries.key],
      queryFn: () => unwrap(api.settings.$get()),
    }),
  ui: () =>
    queryOptions({
      queryKey: [...settingsQueries.key, "ui"] as const,
      queryFn: () => unwrap(api.settings.ui.$get()),
      staleTime: 60_000,
    }),
  tmdbKeyStatus: () =>
    queryOptions({
      queryKey: [...settingsQueries.key, "tmdb-key-status"] as const,
      queryFn: () => unwrap(api.settings["tmdb-key-status"].$get()),
    }),
};

export function useUpsertSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertSettingsInput) => unwrap(api.settings.$put({ json: input })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueries.key });
      toast.success(t`Settings saved`);
    },
    onError: (error) => {
      toast.error(t`Failed to save settings`, {
        description: formatError(error),
      });
    },
  });
}
