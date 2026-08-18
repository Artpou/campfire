import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";

import { ModuleConfigActions } from "@/features/module/components/config/module-config-actions";
import { useModuleConfigActions } from "@/features/module/hooks/use-module-config-actions";

type SystemKeyForm = { apiKey: string };

function readApiKey(config: Record<string, unknown>): string {
  const key = config.apiKey;
  if (typeof key === "string" && key && !key.startsWith("****")) return key;
  return "";
}

export function ModuleConfigSystemKey({ mod }: { mod: Module }) {
  const actions = useModuleConfigActions(mod);
  const config = mod.config as Record<string, unknown>;

  const { register, handleSubmit, getValues } = useForm<SystemKeyForm>({
    values: { apiKey: readApiKey(config) },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => actions.save(values))}>
      <Input
        classNameWrapper="w-full"
        label={<Trans>API key</Trans>}
        password
        placeholder={mod.configRequired ? "Required" : "Leave blank to use environment variable"}
        {...register("apiKey")}
      />
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
