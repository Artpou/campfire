import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ModuleType } from "@seedarr/contracts";
import { buildModulePatchConfig } from "@seedarr/contracts";
import type { Module } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { moduleQueries, useUpdateModule } from "@/features/module/hooks/module.queries";

export function useModuleConfigActions(mod: Module) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateModule();

  const toPatch = (values: Record<string, unknown>) =>
    buildModulePatchConfig(mod.type as ModuleType, values, mod.config as Record<string, unknown>);

  const save = (values: Record<string, unknown>, onSuccess?: () => void) => {
    updateMutation.mutate(
      { id: mod.id, config: toPatch(values) },
      {
        onSuccess: () => {
          toast.info(t(msg`Settings saved`));
          queryClient.invalidateQueries({ queryKey: [...moduleQueries.key, mod.id, "health"] });
          queryClient.invalidateQueries({ queryKey: moduleQueries.get(mod.id).queryKey });
          onSuccess?.();
        },
        onError: (error) => toast.error(t(msg`Could not save`), { description: formatError(error) }),
      },
    );
  };

  const testMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      unwrap(
        api.modules[":id"].test.$post({
          param: { id: mod.id },
          json: { config: toPatch(values) },
        }),
      ),
    onSuccess: (data) => {
      if (data.ok) toast.success(t(msg`Connection OK`));
      else toast.error(t(msg`Connection failed`), { description: data.message });
    },
    onError: (error) => toast.error(t(msg`Connection failed`), { description: formatError(error) }),
  });

  const test = (values: Record<string, unknown>) => testMutation.mutate(values);

  return {
    save,
    test,
    isSaving: updateMutation.isPending,
    isTesting: testMutation.isPending,
    isPending: updateMutation.isPending || testMutation.isPending,
  };
}
