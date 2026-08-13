import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { CreateIndexerManagerInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ZapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { INDEXER_DEFAULTS } from "@/features/indexers-manager/indexers-manager";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";
import { indexerManagerQueries } from "@/features/torrent/hooks/indexer.queries";

type Selection = "torrentio" | "prowlarr" | "jackett";

interface OnboardingIndexersProps {
  onContinue: () => void;
  onBack: () => void;
}

export function OnboardingIndexers({ onContinue, onBack }: OnboardingIndexersProps) {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: CreateIndexerManagerInput) => unwrap(api["indexer-manager"].$post({ json: data })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: indexerManagerQueries.key });
      onContinue();
    },
  });

  const select = (type: Selection) => {
    setSelection(type);
    if (type === "prowlarr" || type === "jackett") {
      setIndexerUrl(INDEXER_DEFAULTS[type] ?? "");
      setIndexerApiKey("");
    }
  };

  const canContinue =
    selection === "torrentio" ||
    ((selection === "prowlarr" || selection === "jackett") && indexerUrl.length > 0 && indexerApiKey.length > 0);

  const handleContinue = () => {
    if (!selection || !canContinue) return;
    if (selection === "torrentio") {
      createMutation.mutate({ type: "PRESET", preset: "torrentio" });
      return;
    }
    createMutation.mutate({
      type: "SELF_HOSTED",
      indexerType: selection,
      indexerUrl,
      indexerApiKey,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          <Trans>Torrent search</Trans>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>Connect an indexer so Seedarr can search torrents. Torrentio is recommended for a quick start.</Trans>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          className={cn(
            "relative cursor-pointer rounded-md border p-4 text-left transition-colors",
            selection === "torrentio"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary hover:bg-primary/5",
          )}
          onClick={() => select("torrentio")}
        >
          <Badge className="absolute top-2 left-2 text-[10px]">
            <Trans>Recommended</Trans>
          </Badge>
          <div className="mt-4 flex items-center gap-2">
            <ZapIcon className="text-primary size-4" />
            <h3 className="font-semibold">Torrentio</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans>No setup required. Browse torrents from public trackers instantly.</Trans>
          </p>
        </button>

        <button
          type="button"
          className={cn(
            "cursor-pointer rounded-md border p-4 text-left transition-colors",
            selection === "prowlarr"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary hover:bg-primary/5",
          )}
          onClick={() => select("prowlarr")}
        >
          <h3 className="font-semibold">Prowlarr</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans>Indexer manager for *arr apps</Trans>
          </p>
        </button>

        <button
          type="button"
          className={cn(
            "cursor-pointer rounded-md border p-4 text-left transition-colors",
            selection === "jackett"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary hover:bg-primary/5",
          )}
          onClick={() => select("jackett")}
        >
          <h3 className="font-semibold">Jackett</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            <Trans>Proxy server for torrent trackers</Trans>
          </p>
        </button>
      </div>

      {(selection === "prowlarr" || selection === "jackett") && (
        <Card className="p-4 bg-transparent">
          <Input
            label={<Trans>URL</Trans>}
            placeholder={INDEXER_DEFAULTS[selection]}
            value={indexerUrl}
            onChange={(e) => setIndexerUrl(e.target.value)}
          />
          <Input
            label={<Trans>API Key</Trans>}
            placeholder={t(msg`Enter your API key...`)}
            value={indexerApiKey}
            onChange={(e) => setIndexerApiKey(e.target.value)}
          />
        </Card>
      )}

      <OnboardingNav
        onBack={onBack}
        onContinue={handleContinue}
        continueLoading={createMutation.isPending}
        continueDisabled={!canContinue}
        rightExtra={
          <Button size="lg" variant="outline" onClick={() => onContinue()}>
            Skip
          </Button>
        }
      />
    </div>
  );
}
