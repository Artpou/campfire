import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";

import { ModuleConfigActions } from "@/features/module/components/config/module-config-actions";
import { useModuleConfigActions } from "@/features/module/hooks/use-module-config-actions";

type LetterboxdForm = { username: string };

export function ModuleConfigLetterboxd({ mod }: { mod: Module }) {
  const actions = useModuleConfigActions(mod);
  const config = mod.config as Record<string, unknown>;

  const { register, handleSubmit } = useForm<LetterboxdForm>({
    values: { username: typeof config.username === "string" ? config.username : "" },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => actions.save(values))}>
      <Input label={<Trans>Default username</Trans>} {...register("username")} />
      <ModuleConfigActions isPending={actions.isPending} isSaving={actions.isSaving} isTesting={actions.isTesting} />
    </form>
  );
}
