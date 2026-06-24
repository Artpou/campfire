import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { CreateIndexerManagerInput } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { cn } from "@seedarr/ui/cn";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { SearchIcon, ZapIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";
import { INDEXER_DEFAULTS, STREMIO_PRESETS } from "@/features/indexers-manager/indexers-manager";

export const Route = createFileRoute("/_app/onboarding")({
  beforeLoad: async () => {
    const onboarded = useAuth.getState().onboarded;
    if (onboarded) throw redirect({ to: "/" });

    const countManagers = await unwrap(api["indexer-manager"].count.$get());
    if (countManagers > 0) throw redirect({ to: "/" });

    useAuth.getState().setOnboarded();
  },
  component: OnboardingPage,
});

type OnboardingStep = "select" | "config";
type OnboardingType = "preset" | "prowlarr" | "jackett";

function OnboardingPage() {
  const { t } = useLingui();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<OnboardingStep>("select");
  const [configType, setConfigType] = useState<OnboardingType>("preset");
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: CreateIndexerManagerInput) => unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: async () => {
      const data = await unwrap(api.auth.me.$get());
      useAuth.getState().setUser(data);
      queryClient.invalidateQueries({ queryKey: ["indexer-manager"] });
      navigate({ to: "/" });
    },
  });

  const handleSelectType = (type: OnboardingType) => {
    setConfigType(type);
    if (type !== "preset") {
      setIndexerUrl(INDEXER_DEFAULTS[type] ?? "");
      setStep("config");
    } else {
      setStep("config");
    }
  };

  const handlePresetSelect = (preset: "torrentio" | "comet" | "mediafusion") => {
    createMutation.mutate({ type: "PRESET", preset });
  };

  const handleSubmit = () => {
    if (configType === "prowlarr" || configType === "jackett") {
      createMutation.mutate({ type: "SELF_HOSTED", indexerType: configType, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit = indexerUrl.length > 0 && indexerApiKey.length > 0;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl bg-background">
        <CardHeader className="text-center">
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
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  className="cursor-pointer p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left relative"
                  onClick={() => handleSelectType("preset")}
                >
                  <Badge className="absolute top-2 left-2 text-[10px]">
                    <Trans>Recommended</Trans>
                  </Badge>
                  <div className="flex items-center gap-2 mt-4">
                    <ZapIcon className="size-4 text-primary" />
                    <h3>
                      <Trans>Stremio Presets</Trans>
                    </h3>
                  </div>
                  <p className="text-xs text-popover-foreground mt-1">
                    <Trans>No setup required. Browse torrents from public trackers instantly.</Trans>
                  </p>
                </button>
                <button
                  type="button"
                  className="cursor-pointer p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => handleSelectType("prowlarr")}
                >
                  <h3 className="font-semibold">Prowlarr</h3>
                  <p className="text-xs text-popover-foreground mt-1">
                    <Trans>Indexer manager for *arr apps</Trans>
                  </p>
                </button>
                <button
                  type="button"
                  className="cursor-pointer p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  onClick={() => handleSelectType("jackett")}
                >
                  <h3 className="font-semibold">Jackett</h3>
                  <p className="text-xs text-popover-foreground mt-1">
                    <Trans>Proxy server for torrent trackers</Trans>
                  </p>
                </button>
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => navigate({ to: "/" })} className="text-muted-foreground">
                  <Trans>Skip for now</Trans>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {configType === "preset" && (
                <div className="flex flex-col gap-3">
                  {STREMIO_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={createMutation.isPending}
                      className="relative w-full cursor-pointer p-4 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handlePresetSelect(preset.value)}
                    >
                      {preset.value === "torrentio" && (
                        <Badge className="absolute top-2 left-2 text-[10px]">
                          <Trans>Recommended</Trans>
                        </Badge>
                      )}
                      <div className={cn("flex items-center gap-3", preset.value === "torrentio" && "mt-4")}>
                        {preset.image && (
                          <img src={preset.image} alt={preset.label} className="size-7 object-contain" />
                        )}
                        {preset.emoji && <span className="text-xl">{preset.emoji}</span>}
                        <div>
                          <h3 className="font-semibold text-sm">{preset.label}</h3>
                          <p className="text-xs text-popover-foreground mt-1">{preset.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {configType !== "preset" && (
                <div className="space-y-4">
                  <Input
                    label={<Trans>URL</Trans>}
                    placeholder={INDEXER_DEFAULTS[configType]}
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
                  <Button variant="outline" onClick={() => navigate({ to: "/" })} className="text-muted-foreground">
                    <Trans>Skip for now</Trans>
                  </Button>
                  {configType !== "preset" && (
                    <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
                      <Trans>Confirm</Trans>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
