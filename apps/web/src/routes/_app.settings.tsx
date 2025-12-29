import { useMemo } from "react";

import { CreateIndexerManager } from "@basement/validators/indexerManager.validators";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, LogOut } from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useAuthStore } from "@/features/auth/auth-store";
import { IndexerType } from "../../../api/src/db/schema";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  // Fetch indexers using React Query
  const { data: indexerManagers = [] } = useQuery({
    queryKey: ["indexerManagers"],
    queryFn: async () => {
      const response = await api.indexerManagers.get();
      return response.data || [];
    },
    initialData: [],
  });

  const handleLogout = async () => {
    await api.auth.logout.post();
    logout();
    navigate({ to: "/login" });
  };

  const { mutate: upsertIndexerManager } = useMutation({
    mutationFn: async (data: CreateIndexerManager) => api.indexerManagers.post(data),
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

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <Trans>Settings</Trans>
          </h1>
          <p className="text-muted-foreground mt-2">
            <Trans>Manage your application preferences and API integrations.</Trans>
          </p>
        </div>

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
                    <div className="space-y-2">
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
      </div>
    </div>
  );
}
