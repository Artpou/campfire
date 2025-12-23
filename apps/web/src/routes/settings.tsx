import { createFileRoute } from "@tanstack/react-router";
import { Download, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTmdb } from "@/hooks/use-tmdb";
import { useTorrentIndexer } from "@/hooks/use-torrent-indexer";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { apiKey, updateApiKey } = useTmdb();
  const {
    indexerType,
    setIndexerType,
    jackettApiKey,
    updateJackettApiKey,
    prowlarrApiKey,
    updateProwlarrApiKey,
  } = useTorrentIndexer();

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your application preferences and API integrations.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="size-5" />
              <CardTitle>Torrent Indexer</CardTitle>
            </div>
            <CardDescription>
              Configure your torrent indexer to search and download torrents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              value={indexerType}
              onValueChange={(v) => setIndexerType(v as "jackett" | "prowlarr")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="jackett">Jackett</TabsTrigger>
                <TabsTrigger value="prowlarr">Prowlarr</TabsTrigger>
              </TabsList>
              <TabsContent value="jackett" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="jackett-api-key"
                    placeholder="Enter your Jackett API key..."
                    label="Jackett API Key"
                    value={jackettApiKey || ""}
                    onChange={(e) => updateJackettApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Jackett API key is stored locally and used to search torrents.
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="prowlarr" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="prowlarr-api-key"
                    placeholder="Enter your Prowlarr API key..."
                    label="Prowlarr API Key"
                    value={prowlarrApiKey || ""}
                    onChange={(e) => updateProwlarrApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Prowlarr API key is stored locally and used to search torrents.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-5" />
              <CardTitle>TMDB API</CardTitle>
            </div>
            <CardDescription>
              Enter your TMDB API key to enable personalized search and detailed movie information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                id="tmdb-api-key"
                placeholder="Enter your TMDB API key..."
                label="API Key"
                value={apiKey || ""}
                onChange={(e) => updateApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and is never sent to our servers
                except as an Authorization header.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
