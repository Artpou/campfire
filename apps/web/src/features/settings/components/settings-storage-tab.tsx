import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import {
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  GlobeIcon,
  Loader2Icon,
  NetworkIcon,
  RefreshCwIcon,
  ServerIcon,
  Trash2Icon,
  TvIcon,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import {
  storageConfigQueries,
  useTestStorageConnection,
  useUpsertStorageConfig,
} from "@/features/settings/hooks/storage-config.queries";

type Protocol = "ftp" | "webdav";

const DEFAULT_PORTS: Record<Protocol, number> = { ftp: 21, webdav: 443 };

export function SettingsStorageTab() {
  const { t } = useLingui();
  const { data: config, isLoading } = useQuery(storageConfigQueries.get());

  const upsertMutation = useUpsertStorageConfig();
  const testMutation = useTestStorageConnection();

  const [enabled, setEnabled] = useState(false);
  const [protocol, setProtocol] = useState<Protocol>("ftp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(21);
  const [secure, setSecure] = useState(false);
  const [moviePath, setMoviePath] = useState("");
  const [tvPath, setTvPath] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteLocalAfterTransfer, setDeleteLocalAfterTransfer] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!initialized && config && !isLoading) {
      const proto = (config.protocol as Protocol) || "ftp";
      setEnabled(config.enabled);
      setProtocol(proto);
      setHost(config.host);
      setPort(config.port ?? DEFAULT_PORTS[proto]);
      setSecure(config.secure ?? false);
      setMoviePath(config.moviePath ?? "");
      setTvPath(config.tvPath ?? "");
      setUsername(config.username ?? "");
      setDeleteLocalAfterTransfer(config.deleteLocalAfterTransfer ?? false);
      setInitialized(true);
    }
  }, [initialized, config, isLoading]);

  const hasRequiredFields = Boolean(host);
  const connectionPayload = {
    protocol,
    host,
    port,
    secure,
    username: username || undefined,
    password: password || undefined,
  };

  const handleSave = () => {
    upsertMutation.mutate({
      enabled,
      protocol,
      host,
      port,
      secure,
      moviePath: moviePath || undefined,
      tvPath: tvPath || undefined,
      username: username || undefined,
      password: password || undefined,
      deleteLocalAfterTransfer,
    });
  };

  const handleTest = () => {
    testMutation.mutate(connectionPayload);
  };

  const handleToggleAutoTransfer = async () => {
    if (enabled) {
      setEnabled(false);
      return;
    }

    if (!hasRequiredFields) return;

    setEnabling(true);
    try {
      const result = await testMutation.mutateAsync(connectionPayload);
      if (result.success) {
        setEnabled(true);
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleProtocolChange = (value: string) => {
    const newProtocol = value as Protocol;
    setProtocol(newProtocol);
    setPort(DEFAULT_PORTS[newProtocol]);
    setSecure(newProtocol === "webdav");
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2">
          <ServerIcon className="size-5" />
          <Trans>Remote Storage</Trans>
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
                <Input
                  id="ftp-host"
                  placeholder={t`192.168.1.254 or hostname`}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftp-port">
                  <Trans>Port</Trans>
                </Label>
                <Input
                  id="ftp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ftp-username">
                  <Trans>Username</Trans>
                </Label>
                <Input
                  id="ftp-username"
                  placeholder={t`Optional`}
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ftp-secure"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="ftp-secure" className="text-sm cursor-pointer">
                <Trans>Use FTPS (FTP over TLS)</Trans>
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="webdav" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="webdav-host">
                  <Trans>Host</Trans>
                </Label>
                <Input
                  id="webdav-host"
                  placeholder={t`nas.local or 192.168.1.254`}
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
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
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="webdav-username">
                  <Trans>Username</Trans>
                </Label>
                <Input
                  id="webdav-username"
                  placeholder={t`Optional`}
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="webdav-secure"
                checked={secure}
                onChange={(e) => setSecure(e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="webdav-secure" className="text-sm cursor-pointer">
                <Trans>Use HTTPS</Trans>
              </Label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-col gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="movie-path" className="flex items-center gap-2">
              <FilmIcon className="size-3.5" />
              <Trans>Movie path</Trans>
            </Label>
            <Input
              id="movie-path"
              placeholder={t`e.g. Movies (optional)`}
              value={moviePath}
              onChange={(e) => setMoviePath(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tv-path" className="flex items-center gap-2">
              <TvIcon className="size-3.5" />
              <Trans>TV Shows path</Trans>
            </Label>
            <Input
              id="tv-path"
              placeholder={t`e.g. TV Shows (optional)`}
              value={tvPath}
              onChange={(e) => setTvPath(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleTest} disabled={!hasRequiredFields || testMutation.isPending}>
            {testMutation.isPending && !enabling && <Loader2Icon className="size-4 animate-spin" />}
            <Trans>Test connection</Trans>
          </Button>

          <Button onClick={handleSave} disabled={!hasRequiredFields || upsertMutation.isPending}>
            {upsertMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
            <Trans>Save configuration</Trans>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCwIcon className="size-5 shrink-0" />
            <div className="space-y-1">
              <Label>
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
          <Button
            variant={enabled ? "secondary" : "default"}
            size="sm"
            onClick={handleToggleAutoTransfer}
            disabled={!hasRequiredFields || enabling || testMutation.isPending}
          >
            {(enabling || (testMutation.isPending && !enabled)) && <Loader2Icon className="size-4 animate-spin" />}
            {enabled ? <Trans>Disable</Trans> : <Trans>Enable</Trans>}
          </Button>
        </div>

        {enabled && (
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <div className="flex items-center gap-3">
              <Trash2Icon className="size-5 shrink-0" />
              <div className="space-y-1">
                <Label>
                  <Trans>Delete local files after auto-transfer</Trans>
                </Label>
                <p className="text-sm text-muted-foreground">
                  <Trans>
                    Only applies to automatic transfers. Local files are deleted once the auto-transfer succeeds. Manual
                    transfers always keep a local copy. Streaming is unavailable while an auto-transfer download is in
                    progress.
                  </Trans>
                </p>
              </div>
            </div>
            <Button
              variant={deleteLocalAfterTransfer ? "secondary" : "default"}
              size="sm"
              onClick={() => setDeleteLocalAfterTransfer(!deleteLocalAfterTransfer)}
            >
              {deleteLocalAfterTransfer ? <Trans>Disable</Trans> : <Trans>Enable</Trans>}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
