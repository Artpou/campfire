import { Trans } from "@lingui/react/macro";
import type { Module } from "@seedarr/sdk";
import { Controller, useForm } from "react-hook-form";

import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

import { ModuleConfigActions } from "@/features/module/components/config/module-config-actions";
import { useModuleConfigActions } from "@/features/module/hooks/use-module-config-actions";

type StorageForm = {
  host: string;
  port: number;
  username: string;
  password: string;
  moviePath: string;
  tvPath: string;
  autoTransfer: boolean;
  deleteLocalAfterTransfer: boolean;
  diskQuotaGb: number | "";
};

export function ModuleConfigStorage({ mod }: { mod: Module }) {
  const actions = useModuleConfigActions(mod);
  const config = mod.config as Record<string, unknown>;
  const defaultPort = mod.type === "webdav" ? 443 : 21;

  const { register, handleSubmit, getValues, control } = useForm<StorageForm>({
    values: {
      host: typeof config.host === "string" ? config.host : "",
      port: typeof config.port === "number" ? config.port : defaultPort,
      username: typeof config.username === "string" ? config.username : "",
      password: "",
      moviePath: typeof config.moviePath === "string" ? config.moviePath : "",
      tvPath: typeof config.tvPath === "string" ? config.tvPath : "",
      autoTransfer: config.autoTransfer === true,
      deleteLocalAfterTransfer: config.deleteLocalAfterTransfer === true,
      diskQuotaGb: typeof config.diskQuotaGb === "number" ? config.diskQuotaGb : "",
    },
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => actions.save(values))}>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Input classNameWrapper="w-full" label={<Trans>Host</Trans>} {...register("host", { required: true })} />
        <Input
          classNameWrapper="sm:w-32 w-full"
          label={<Trans>Port</Trans>}
          type="number"
          {...register("port", { valueAsNumber: true, required: true })}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Input classNameWrapper="flex-1" label={<Trans>Username</Trans>} {...register("username")} />
        <Input
          classNameWrapper="flex-1"
          label={<Trans>Password</Trans>}
          password
          placeholder={mod.hasSecrets ? "•••• (unchanged)" : undefined}
          {...register("password")}
        />
      </div>
      <Input label={<Trans>Movie path</Trans>} {...register("moviePath")} />
      <Input label={<Trans>TV path</Trans>} {...register("tvPath")} />
      {mod.type === "ftp" && (
        <Input
          label={<Trans>Disk quota (GB)</Trans>}
          type="number"
          min={1}
          placeholder="∞"
          {...register("diskQuotaGb", {
            setValueAs: (value) => {
              if (value === "" || value == null) return "";
              const n = Number(value);
              return Number.isFinite(n) && n > 0 ? n : "";
            },
          })}
        />
      )}
      <Controller
        control={control}
        name="autoTransfer"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>
                <Trans>Auto transfer</Trans>
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans>Automatically move completed downloads to remote storage.</Trans>
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
      <Controller
        control={control}
        name="deleteLocalAfterTransfer"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>
                <Trans>Delete local after transfer</Trans>
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans>Remove local files once the remote transfer succeeds.</Trans>
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
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
