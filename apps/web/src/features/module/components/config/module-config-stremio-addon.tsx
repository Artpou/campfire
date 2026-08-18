import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";

import { ModuleConfigActions } from "@/features/module/components/config/module-config-actions";
import { useModuleConfigActions } from "@/features/module/hooks/use-module-config-actions";

type StremioForm = { manifestUrl: string };

export function ModuleConfigStremioAddon({ mod }: { mod: Module }) {
  const actions = useModuleConfigActions(mod);
  const config = mod.config as Record<string, unknown>;

  const { register, handleSubmit, getValues } = useForm<StremioForm>({
    values: { manifestUrl: typeof config.manifestUrl === "string" ? config.manifestUrl : "" },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => actions.save(values))}>
      <Input label={<Trans>Manifest URL</Trans>} {...register("manifestUrl", { required: true })} />
      <ModuleConfigActions
        canTest
        onTest={() => actions.test(getValues())}
        isPending={actions.isPending}
        isSaving={actions.isSaving}
        isTesting={actions.isTesting}
      />
    </form>
  );
}
