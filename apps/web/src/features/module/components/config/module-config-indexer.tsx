import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";

import { ModuleConfigActions } from "@/features/module/components/config/module-config-actions";
import { useModuleConfigActions } from "@/features/module/hooks/use-module-config-actions";

type IndexerForm = { url: string; apiKey: string };

function readApiKey(config: Record<string, unknown>, configRequired?: boolean): string {
  const key = config.apiKey;
  if (typeof key === "string" && key !== "changeme" && !(configRequired && key.startsWith("****"))) {
    if (!key.startsWith("****")) return key;
  }
  return "";
}

export function ModuleConfigIndexer({ mod }: { mod: Module }) {
  const actions = useModuleConfigActions(mod);
  const config = mod.config as Record<string, unknown>;

  const { register, handleSubmit, getValues, formState } = useForm<IndexerForm>({
    values: {
      url: typeof config.url === "string" ? config.url : "",
      apiKey: readApiKey(config, mod.configRequired),
    },
  });

  const hasExistingKey =
    !mod.configRequired &&
    (Boolean(config.hasApiKey) || (typeof config.apiKey === "string" && config.apiKey.startsWith("****")));

  const canSave = formState.isDirty
    ? Boolean(getValues("url").trim()) && (Boolean(getValues("apiKey")) || hasExistingKey)
    : Boolean(getValues("url").trim()) && (Boolean(getValues("apiKey")) || hasExistingKey);

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => actions.save(values))}>
      <Input label={<Trans>URL</Trans>} {...register("url", { required: true })} />
      <Input
        label={<Trans>API key</Trans>}
        password
        placeholder={mod.configRequired || hasExistingKey ? "••••" : undefined}
        {...register("apiKey")}
      />
      <ModuleConfigActions
        canSave={canSave}
        canTest
        onTest={() => actions.test(getValues())}
        isPending={actions.isPending}
        isSaving={actions.isSaving}
        isTesting={actions.isTesting}
      />
    </form>
  );
}
