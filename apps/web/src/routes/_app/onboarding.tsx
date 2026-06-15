import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerType } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SearchIcon, ZapIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";
import { TorrentioProviderPicker } from "@/features/indexers-manager/components/torrentio-provider-picker";
import { INDEXER_DEFAULTS } from "@/features/indexers-manager/indexers-manager";

export const Route = createFileRoute("/_app/onboarding")({
  beforeLoad: async () => {
    const user = useAuth.getState().user;
    if (user?.indexerManagers && user.indexerManagers.length > 0) {
      throw redirect({ to: "/" });
    }
  },
  component: OnboardingPage,
});

type OnboardingStep = "select" | "config";

function OnboardingPage() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<OnboardingStep>("select");
  const [indexerType, setIndexerType] = useState<IndexerType>("torrentio");
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");
  const [providers, setProviders] = useState<Set<string>>(new Set());

  const createMutation = useMutation({
    mutationFn: (data: {
      indexerType: IndexerType;
      indexerUrl?: string;
      indexerApiKey?: string;
      providers?: string[];
    }) => unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: async () => {
      const data = await unwrap(api.auth.me.$get());
      useAuth.getState().setUser(data);
      queryClient.invalidateQueries({ queryKey: ["indexer-manager"] });
      navigate({ to: "/" });
    },
  });

  const handleSelectType = (type: IndexerType) => {
    setIndexerType(type);
    setIndexerUrl(INDEXER_DEFAULTS[type] ?? "");
    setStep("config");
  };

  const toggleProvider = (value: string) => {
    setProviders((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSubmit = () => {
    if (indexerType === "torrentio") {
      createMutation.mutate({ indexerType, providers: Array.from(providers) });
    } else {
      createMutation.mutate({ indexerType, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit = (() => {
    if (indexerType === "torrentio") return providers.size > 0;
    return indexerUrl.length > 0 && indexerApiKey.length > 0;
  })();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
              <SearchIcon className="size-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            <Trans>Configure your media source</Trans>
          </CardTitle>
          <CardDescription className="text-base max-w-md mx-auto">
            <Trans>
              Seedarr needs a torrent indexer to search for movies and TV shows. Choose a source below to get started.
            </Trans>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "select" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  className="p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left relative"
                  onClick={() => handleSelectType("torrentio")}
                >
                  <Badge className="absolute top-2 left-2 text-[10px]">
                    <Trans>Recommended</Trans>
                  </Badge>
                  <div className="flex items-center gap-2 mt-4">
                    <ZapIcon className="size-4 text-primary" />
                    <p className="font-semibold">Torrentio</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Trans>No setup required. Browse torrents from public trackers instantly.</Trans>
                  </p>
                </button>
                <button
                  type="button"
                  className="p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => handleSelectType("prowlarr")}
                >
                  <p className="font-semibold">Prowlarr</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Trans>Indexer manager for *arr apps</Trans>
                  </p>
                </button>
                <button
                  type="button"
                  className="p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => handleSelectType("jackett")}
                >
                  <p className="font-semibold">Jackett</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Trans>Proxy server for torrent trackers</Trans>
                  </p>
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" onClick={() => navigate({ to: "/" })} className="text-muted-foreground">
                  <Trans>Skip for now</Trans>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {indexerType === "torrentio" && (
                <TorrentioProviderPicker selected={providers} onToggle={toggleProvider} />
              )}

              {indexerType !== "torrentio" && (
                <div className="space-y-4">
                  <Input
                    label={<Trans>URL</Trans>}
                    placeholder={INDEXER_DEFAULTS[indexerType]}
                    value={indexerUrl}
                    onChange={(e) => setIndexerUrl(e.target.value)}
                  />
                  <Input
                    label={<Trans>API Key</Trans>}
                    placeholder={t(msg`Enter your API key...`)}
                    value={indexerApiKey}
                    onChange={(e) => setIndexerApiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep("select")}>
                  <Trans>Back</Trans>
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => navigate({ to: "/" })} className="text-muted-foreground">
                    <Trans>Skip for now</Trans>
                  </Button>
                  <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
                    <Trans>Confirm</Trans>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
