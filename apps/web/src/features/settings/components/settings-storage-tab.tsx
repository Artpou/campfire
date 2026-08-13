import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import {
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  GlobeIcon,
  NetworkIcon,
  RefreshCwIcon,
  ServerIcon,
  Trash2Icon,
  TvIcon,
  UnplugIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import {
  storageConfigQueries,
  useDisconnectStorageConfig,
  useTestStorageConnection,
  useUpsertStorageConfig,
} from "@/features/settings/hooks/storage-config.queries";

type Protocol = "ftp" | "webdav";

const DEFAULT_PORTS: Record<Protocol, number> = { ftp: 21, webdav: 443 };

interface StorageFormData {
  protocol: Protocol;
  host: string;
  port: number;
  secure: boolean;
  moviePath: string;
  tvPath: string;
  username: string;
  password: string;
}

interface SettingsStorageTabProps {
  titleAddon?: ReactNode;
  hideOptions?: boolean;
}

export function SettingsStorageTab({ titleAddon, hideOptions = false }: SettingsStorageTabProps) {
  const { t } = useLingui();
  const { data: config, isLoading } = useQuery(storageConfigQueries.get());

  const upsertMutation = useUpsertStorageConfig();
  const testMutation = useTestStorageConnection();
  const disconnectMutation = useDisconnectStorageConfig();

  const [enabled, setEnabled] = useState(false);
  const [autoTransfer, setAutoTransfer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteLocalAfterTransfer, setDeleteLocalAfterTransfer] = useState(false);
  const [diskQuotaGb, setDiskQuotaGb] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { register, watch, setValue, reset, handleSubmit } = useForm<StorageFormData>({
    defaultValues: {
      protocol: "ftp",
      host: "",
      port: 21,
      secure: false,
      moviePath: "",
      tvPath: "",
      username: "",
      password: "",
    },
  });

  const protocol = watch("protocol");
  const host = watch("host");
  const secure = watch("secure");

  useEffect(() => {
    if (!initialized && config && !isLoading) {
      const proto = (config.protocol as Protocol) || "ftp";
      setEnabled(config.enabled);
      setAutoTransfer(config.autoTransfer ?? false);
      setDeleteLocalAfterTransfer(config.deleteLocalAfterTransfer ?? false);
      setDiskQuotaGb(config.diskQuotaGb ?? null);
      reset({
        protocol: proto,
        host: config.host,
        port: config.port ?? DEFAULT_PORTS[proto],
        secure: config.secure ?? false,
        moviePath: config.moviePath ?? "",
        tvPath: config.tvPath ?? "",
        username: config.username ?? "",
        password: "",
      });
      setInitialized(true);
    }
  }, [initialized, config, isLoading, reset]);

  const hasRequiredFields = Boolean(host);

  const buildPayload = (
    data: StorageFormData,
    overrides: Partial<{
      enabled: boolean;
      autoTransfer: boolean;
      deleteLocalAfterTransfer: boolean;
      diskQuotaGb: number | null;
    }> = {},
  ) => ({
    enabled: overrides.enabled ?? enabled,
    autoTransfer: overrides.autoTransfer ?? autoTransfer,
    protocol: data.protocol,
    host: data.host,
    port: data.port,
    secure: data.secure,
    moviePath: data.moviePath || undefined,
    tvPath: data.tvPath || undefined,
    username: data.username || undefined,
    password: data.password || undefined,
    deleteLocalAfterTransfer: overrides.deleteLocalAfterTransfer ?? deleteLocalAfterTransfer,
    diskQuotaGb: overrides.diskQuotaGb !== undefined ? overrides.diskQuotaGb : diskQuotaGb,
  });

  const handleSave = handleSubmit((data) => {
    upsertMutation.mutate(buildPayload(data, { enabled: true }), {
      onSuccess: () => setEnabled(true),
    });
  });

  const handleTest = handleSubmit((data) => {
    testMutation.mutate({
      protocol: data.protocol,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username || undefined,
      password: data.password || undefined,
    });
  });

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => {
        setEnabled(false);
        setAutoTransfer(false);
      },
    });
  };

  const saveAutoTransfer = (checked: boolean) => {
    handleSubmit((data) => {
      if (!hasRequiredFields || !enabled) return;
      upsertMutation.mutate(buildPayload(data, { autoTransfer: checked }), {
        onSuccess: () => setAutoTransfer(checked),
      });
    })();
  };

  const saveDeleteLocal = (checked: boolean) => {
    handleSubmit((data) => {
      if (!hasRequiredFields || !enabled) return;
      upsertMutation.mutate(buildPayload(data, { deleteLocalAfterTransfer: checked }), {
        onSuccess: () => setDeleteLocalAfterTransfer(checked),
      });
    })();
  };

  const handleProtocolChange = (value: string) => {
    const newProtocol = value as Protocol;
    setValue("protocol", newProtocol);
    setValue("port", DEFAULT_PORTS[newProtocol]);
    setValue("secure", newProtocol === "webdav");
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2">
          <ServerIcon className="size-5" />
          <Trans>Remote Storage</Trans>
          {titleAddon}
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans>
            Configure a remote server to transfer downloaded files, either manually or automatically after completion.
          </Trans>
        </p>
      </div>

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <NetworkIcon className="size-4" />
          <Trans>Connection</Trans>
        </h3>

        <Tabs value={protocol} onValueChange={handleProtocolChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ftp" className="flex items-center gap-2">
              <ServerIcon className="size-3.5" />
              FTP / FTPS
            </TabsTrigger>
            <TabsTrigger value="webdav" className="flex items-center gap-2">
              <GlobeIcon className="size-3.5" />
              WebDAV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ftp" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="ftp-host">
                  <Trans>Host</Trans>
                </Label>
                <Input id="ftp-host" placeholder={t`192.168.1.254 or hostname`} {...register("host")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp-port">
                  <Trans>Port</Trans>
                </Label>
                <Input id="ftp-port" type="number" min={1} max={65535} {...register("port", { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ftp-username">
                  <Trans>Username</Trans>
                </Label>
                <Input id="ftp-username" placeholder={t`Optional`} autoComplete="off" {...register("username")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp-password">
                  <Trans>Password</Trans>
                </Label>
                <div className="relative">
                  <Input
                    id="ftp-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={config?.hasPassword ? t`••••••• (unchanged)` : t`Optional`}
                    autoComplete="off"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Switch id="ftp-secure" checked={secure} onCheckedChange={(checked) => setValue("secure", checked)} />
                <Label htmlFor="ftp-secure" className="text-sm cursor-pointer">
                  <Trans>Use FTPS (FTP over TLS)</Trans>
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disk-quota-gb">
                  <Trans>Size available (GB)</Trans>
                </Label>
                <Input
                  id="disk-quota-gb"
                  type="number"
                  min={0}
                  step={1}
                  placeholder={t`Optional — for storage bar on FTP`}
                  value={diskQuotaGb ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDiskQuotaGb(value === "" ? null : Number(value));
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="webdav" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="webdav-host">
                  <Trans>Host</Trans>
                </Label>
                <Input id="webdav-host" placeholder={t`nas.local or 192.168.1.254`} {...register("host")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webdav-port">
                  <Trans>Port</Trans>
                </Label>
                <Input
                  id="webdav-port"
                  type="number"
                  min={1}
                  max={65535}
                  {...register("port", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="webdav-username">
                  <Trans>Username</Trans>
                </Label>
                <Input id="webdav-username" placeholder={t`Optional`} autoComplete="off" {...register("username")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webdav-password">
                  <Trans>Password</Trans>
                </Label>
                <div className="relative">
                  <Input
                    id="webdav-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={config?.hasPassword ? t`••••••• (unchanged)` : t`Optional`}
                    autoComplete="off"
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="webdav-secure" className="text-sm cursor-pointer">
                <Trans>Use HTTPS</Trans>
              </Label>
              <Switch id="webdav-secure" checked={secure} onCheckedChange={(checked) => setValue("secure", checked)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="movie-path" className="flex items-center gap-2">
              <FilmIcon className="size-3.5" />
              <Trans>Movie path</Trans>
            </Label>
            <Input id="movie-path" placeholder={t`e.g. Movies (optional)`} {...register("moviePath")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tv-path" className="flex items-center gap-2">
              <TvIcon className="size-3.5" />
              <Trans>TV Shows path</Trans>
            </Label>
            <Input id="tv-path" placeholder={t`e.g. TV Shows (optional)`} {...register("tvPath")} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {enabled && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              aria-label={t`Disconnect`}
              icon={UnplugIcon}
            />
          )}

          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={!hasRequiredFields}
            loading={testMutation.isPending}
          >
            <Trans>Test connection</Trans>
          </Button>

          <Button onClick={handleSave} disabled={!hasRequiredFields} loading={upsertMutation.isPending}>
            <Trans>Save configuration</Trans>
          </Button>
        </div>
      </div>

      {!hideOptions && (
        <div className="flex flex-col gap-4 border rounded-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCwIcon className="size-5 shrink-0" />
              <div className="space-y-1">
                <Label htmlFor="auto-transfer">
                  <Trans>Auto-transfer downloaded files</Trans>
                </Label>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    When enabled, new downloads are automatically transferred to the remote server after completion. You
                    can still transfer files manually at any time.
                  </Trans>
                </p>
              </div>
            </div>
            <Switch
              id="auto-transfer"
              checked={autoTransfer}
              disabled={!enabled || !hasRequiredFields || upsertMutation.isPending}
              onCheckedChange={(checked) => saveAutoTransfer(checked)}
            />
          </div>

          {autoTransfer && (
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <Trash2Icon className="size-5 shrink-0" />
                <div className="space-y-1">
                  <Label htmlFor="delete-local-after-transfer">
                    <Trans>Delete local files after auto-transfer</Trans>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    <Trans>
                      Only applies to automatic transfers. Local files are deleted once the auto-transfer succeeds.
                      Manual transfers always keep a local copy. Streaming is unavailable while an auto-transfer
                      download is in progress.
                    </Trans>
                  </p>
                </div>
              </div>
              <Switch
                id="delete-local-after-transfer"
                checked={deleteLocalAfterTransfer}
                disabled={!enabled || !hasRequiredFields || upsertMutation.isPending}
                onCheckedChange={(checked) => saveDeleteLocal(checked)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
