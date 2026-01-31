import { useMemo } from "react";

// @ts-expect-error TODO: fix this
import type { UpdatePlexConfigInput } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Film, LogOut, RefreshCw, Server, Tv } from "lucide-react";

import { api, unwrap } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";

type IndexerType = "prowlarr" | "jackett";
type CreateIndexerManager = {
  name: IndexerType;
  apiKey?: string;
  baseUrl?: string;
  selected?: boolean;
};

type PlexConnection = {
  address: string;
  port: number;
  protocol: string;
  local: boolean;
};

type PlexServer = {
  name: string;
  machineIdentifier: string;
  connections: PlexConnection[];
};

type SettingsSearch = {
  tab?: "general" | "indexer" | "plex";
};

export const Route = createFileRoute("/_app/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab: (search.tab as SettingsSearch["tab"]) || undefined,
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const logout = useAuth((state) => state.logout);
  const { isAdmin } = useRole();

  // Fetch indexers using React Query
  const { data: indexerManagers = [] } = useQuery({
    queryKey: ["indexerManagers"],
    queryFn: async () => {
      const response = await api["indexer-manager"].$get();
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    initialData: [],
  });

  const handleLogout = async () => {
    await api.auth.logout.$post();
    logout();
    navigate({ to: "/login" });
  };

  const { mutate: upsertIndexerManager } = useMutation({
    mutationFn: async (data: CreateIndexerManager) => api["indexer-manager"].$post({ json: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indexerManagers"] });
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const selectedIndexerManager = useMemo(() => {
    return indexerManagers.find((i) => i.selected)?.name || "jackett";
  }, [indexerManagers]);

  const indexerConfigs = [
    {
      name: "jackett" as IndexerType,
      label: "Jackett",
      placeholder: "Enter your Jackett API key...",
      description: "Your Jackett API key is stored in the database and used to search torrents.",
    },
    {
      name: "prowlarr" as IndexerType,
      label: "Prowlarr",
      placeholder: "Enter your Prowlarr API key...",
      description: "Your Prowlarr API key is stored in the database and used to search torrents.",
    },
  ];

  // Plex Queries & Mutations
  const { data: plexConfig } = useQuery({
    queryKey: ["plexConfig"],
    queryFn: () => unwrap(api.plex.config.$get()),
  });

  const { mutate: updatePlexConfig } = useMutation({
    mutationFn: (data: UpdatePlexConfigInput) => unwrap(api.plex.config.$post({ json: data })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plexConfig"] });
    },
  });

  const {
    data: plexServers = [],
    refetch: refetchServers,
    isFetching: isFetchingServers,
  } = useQuery({
    queryKey: ["plexServers", plexConfig?.token],
    queryFn: () => unwrap(api.plex.servers.$get({ query: { token: plexConfig?.token || "" } })),
    enabled: !!plexConfig?.token,
  });

  const { mutate: syncLibrary } = useMutation({
    mutationFn: (options: { movies?: boolean; tv?: boolean; downloads?: boolean }) =>
      unwrap(api.plex.sync.$post({ json: options })),
  });

  return (
    <Container>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <Trans>Settings</Trans>
          </h1>
          <p className="text-muted-foreground mt-2">
            <Trans>Manage your application preferences and API integrations.</Trans>
          </p>
        </div>

        <Tabs defaultValue={tab || "general"} className="w-full">
          <TabsList className="mb-8 overflow-x-auto h-auto p-1 flex justify-start">
            <TabsTrigger value="general" className="px-6 py-2">
              <Trans>General</Trans>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="indexer" className="px-6 py-2">
                  <Trans>Indexer</Trans>
                </TabsTrigger>
                <TabsTrigger value="plex" className="px-6 py-2">
                  <Trans>Plex</Trans>
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LogOut className="size-5" />
                  <CardTitle>
                    <Trans>Account</Trans>
                  </CardTitle>
                </div>
                <CardDescription>
                  <Trans>Manage your account settings and sign out.</Trans>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleLogout} className="w-full">
                  <LogOut className="mr-2 size-4" />
                  <Trans>Sign Out</Trans>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="indexer" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Download className="size-5" />
                      <CardTitle>
                        <Trans>Torrent Indexer</Trans>
                      </CardTitle>
                    </div>
                    <CardDescription>
                      <Trans>Configure your torrent indexer to search and download torrents.</Trans>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs
                      value={selectedIndexerManager}
                      onValueChange={(v) =>
                        upsertIndexerManager({ name: v as IndexerType, selected: true })
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        {indexerConfigs.map((config) => (
                          <TabsTrigger key={config.name} value={config.name}>
                            <Trans>{config.label}</Trans>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {indexerConfigs.map((config) => {
                        const indexer = indexerManagers.find(
                          (i: { name: IndexerType }) => i.name === config.name,
                        );
                        return (
                          <TabsContent key={config.name} value={config.name} className="space-y-4">
                            <div className="space-y-4">
                              <Input
                                id={`${config.name}-base-url`}
                                placeholder={`http://localhost:${config.name === "prowlarr" ? "9696" : "9117"}`}
                                label={<Trans>{config.label} Base URL</Trans>}
                                defaultValue={indexer?.baseUrl || ""}
                                onBlur={(e) => {
                                  upsertIndexerManager({
                                    name: config.name,
                                    baseUrl: e.target.value,
                                  });
                                }}
                              />
                              <Input
                                id={`${config.name}-api-key`}
                                placeholder={config.placeholder}
                                label={<Trans>{config.label} API Key</Trans>}
                                defaultValue={indexer?.apiKey || ""}
                                onBlur={(e) => {
                                  upsertIndexerManager({
                                    name: config.name,
                                    apiKey: e.target.value,
                                  });
                                }}
                              />
                              <p className="text-xs text-muted-foreground">
                                <Trans>{config.description}</Trans>
                              </p>
                            </div>
                          </TabsContent>
                        );
                      })}
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plex" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Server className="size-5" />
                      <CardTitle>
                        <Trans>Plex Settings</Trans>
                      </CardTitle>
                    </div>
                    <CardDescription>
                      <Trans>Configure the settings for your Plex server.</Trans>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="plex-server-select">
                            <Trans>Server</Trans>
                          </Label>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isFetchingServers || !plexConfig?.token}
                            onClick={() => refetchServers()}
                          >
                            <RefreshCw
                              className={cn("size-4", isFetchingServers && "animate-spin")}
                            />
                          </Button>
                        </div>
                        <Select
                          value={plexConfig?.machineIdentifier || "manual"}
                          onValueChange={(val) => {
                            if (val === "manual") {
                              updatePlexConfig({ machineIdentifier: null, serverName: null });
                            } else {
                              const server = (plexServers as PlexServer[]).find(
                                (s) => s.machineIdentifier === val,
                              );
                              if (server) {
                                // Find a connection (usually local first)
                                const connection =
                                  server.connections.find((c) => c.local) || server.connections[0];
                                updatePlexConfig({
                                  machineIdentifier: val,
                                  serverName: server.name,
                                  hostname: connection.address,
                                  port: connection.port,
                                  useSsl: connection.protocol === "https",
                                });
                              }
                            }
                          }}
                        >
                          <SelectTrigger id="plex-server-select">
                            <SelectValue placeholder={<Trans>Select a server</Trans>} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">
                              <Trans>Manual configuration</Trans>
                            </SelectItem>
                            {(plexServers as PlexServer[]).map((server) => (
                              <SelectItem
                                key={server.machineIdentifier}
                                value={server.machineIdentifier}
                              >
                                {server.name} ({server.connections[0]?.address})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label={<Trans>Hostname or IP Address</Trans>}
                          placeholder="127.0.0.1"
                          defaultValue={plexConfig?.hostname || ""}
                          onBlur={(e) => updatePlexConfig({ hostname: e.target.value })}
                        />
                        <Input
                          label={<Trans>Port</Trans>}
                          type="number"
                          placeholder="32400"
                          defaultValue={plexConfig?.port || 32400}
                          onBlur={(e) => updatePlexConfig({ port: parseInt(e.target.value, 10) })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="plex-token">
                          <Trans>Plex Token</Trans>
                        </Label>
                        <Input
                          id="plex-token"
                          type="password"
                          placeholder="Plex Token"
                          defaultValue={plexConfig?.token || ""}
                          onBlur={(e) => updatePlexConfig({ token: e.target.value })}
                        />
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">
                          <Trans>Library Synchronization</Trans>
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          <Button
                            variant={plexConfig?.syncMovies ? "default" : "outline"}
                            className="flex items-center gap-2"
                            onClick={() =>
                              updatePlexConfig({ syncMovies: !plexConfig?.syncMovies })
                            }
                          >
                            <Film className="size-4" />
                            <Trans>Movies</Trans>
                          </Button>
                          <Button
                            variant={plexConfig?.syncTv ? "default" : "outline"}
                            className="flex items-center gap-2"
                            onClick={() => updatePlexConfig({ syncTv: !plexConfig?.syncTv })}
                          >
                            <Tv className="size-4" />
                            <Trans>TV Shows</Trans>
                          </Button>
                          <Button
                            variant={plexConfig?.syncDownloads ? "default" : "outline"}
                            className="flex items-center gap-2"
                            onClick={() =>
                              updatePlexConfig({ syncDownloads: !plexConfig?.syncDownloads })
                            }
                          >
                            <Download className="size-4" />
                            <Trans>Downloads</Trans>
                          </Button>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() =>
                          syncLibrary({
                            movies: plexConfig?.syncMovies,
                            tv: plexConfig?.syncTv,
                            downloads: plexConfig?.syncDownloads,
                          })
                        }
                      >
                        <Trans>Synchronize Library Now</Trans>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Container>
  );
}
