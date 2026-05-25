import { useEffect, useMemo, useState } from "react";

import type { IndexerType, UpsertIndexerManagerInput } from "@basement/api/types";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ExternalLinkIcon,
  ListIcon,
  LogOut,
  RefreshCwIcon,
  SaveIcon,
  SettingsIcon,
} from "lucide-react";

import { api, unwrap } from "@/lib/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { IndexerList } from "@/features/torrent/components/indexer-list";
import { useIndexers } from "@/features/torrent/hooks/use-indexers";

export const Route = createFileRoute("/_app/settings/")({
  component: SettingsPage,
});

const INDEXER_DEFAULTS: Record<IndexerType, string> = {
  jackett: "http://localhost:9117",
  prowlarr: "http://localhost:9696",
};

function SettingsPage() {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuth((state) => state.logout);
  const { isAdmin } = useRole();

  const { data: indexerConfig } = useQuery({
    queryKey: ["indexer-manager"],
    queryFn: () => unwrap(api["indexer-manager"].$get()),
  });

  const {
    data: availableIndexers,
    isFetching: isIndexersFetching,
    isError: isIndexersError,
  } = useIndexers();

  const [indexerType, setIndexerType] = useState<IndexerType>("jackett");
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");

  useEffect(() => {
    if (indexerConfig) {
      setIndexerType(indexerConfig.indexerType);
      setIndexerUrl(indexerConfig.indexerUrl);
      setIndexerApiKey(indexerConfig.indexerApiKey);
    }
  }, [indexerConfig]);

  const upsertIndexer = useMutation({
    mutationFn: (data: UpsertIndexerManagerInput) =>
      unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indexer-manager"] });
      queryClient.invalidateQueries({ queryKey: ["torrent-indexers"] });
    },
  });

  const handleSave = () => {
    if (!indexerUrl || !indexerApiKey) return;
    upsertIndexer.mutate({
      indexerType,
      indexerUrl,
      indexerApiKey,
    });
  };

  const handleLogout = async () => {
    await api.auth.logout.$post();
    logout();
    navigate({ to: "/login" });
  };

  const canOpenIndexerDashboard = useMemo(
    () => Boolean(indexerConfig?.indexerUrl),
    [indexerConfig],
  );

  const isDirty =
    indexerConfig?.indexerType !== indexerType ||
    indexerConfig?.indexerUrl !== indexerUrl ||
    indexerConfig?.indexerApiKey !== indexerApiKey;

  return (
    <Container>
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-5" />
              <CardTitle>
                <Trans>Torrent Indexer</Trans>
              </CardTitle>
            </div>
            <CardDescription>
              <Trans>
                Configure your Jackett or Prowlarr instance to search and download torrents.
              </Trans>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="indexer-type">
                <Trans>Type</Trans>
              </label>
              <Select
                value={indexerType}
                onValueChange={(v) => {
                  const next = v as IndexerType;
                  setIndexerType(next);
                  if (!indexerUrl) setIndexerUrl(INDEXER_DEFAULTS[next]);
                }}
              >
                <SelectTrigger id="indexer-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jackett">Jackett</SelectItem>
                  <SelectItem value="prowlarr">Prowlarr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              id="indexer-url"
              label={<Trans>URL</Trans>}
              placeholder={INDEXER_DEFAULTS[indexerType]}
              value={indexerUrl}
              onChange={(e) => setIndexerUrl(e.target.value)}
            />

            <Input
              id="indexer-api-key"
              label={<Trans>API Key</Trans>}
              placeholder={t(msg`Enter your API key...`)}
              value={indexerApiKey}
              onChange={(e) => setIndexerApiKey(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSave}
                disabled={!isDirty || !indexerUrl || !indexerApiKey || upsertIndexer.isPending}
              >
                <SaveIcon className="size-4" />
                <Trans>Save</Trans>
              </Button>
              <Button asChild variant="outline" disabled={!canOpenIndexerDashboard}>
                <Link to="/settings/indexer">
                  <SettingsIcon className="size-4" />
                  <Trans>Configure</Trans>
                </Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  <Trans>Available Indexers</Trans>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <IndexerList
                  indexers={availableIndexers}
                  isLoading={isIndexersFetching}
                  isError={isIndexersError}
                />
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

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
    </Container>
  );
}
