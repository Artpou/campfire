import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { MODULE_CATALOG } from "@seedarr/shared";
import { ZapIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { buildCreatePayload } from "@/features/module/helpers/module-list.helper";
import { useCreateModule } from "@/features/module/hooks/module.queries";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";

type Selection = "torrentio" | "prowlarr" | "jackett";

interface OnboardingIndexersProps {
  onContinue: () => void;
  onBack: () => void;
}

export function OnboardingIndexers({ onContinue, onBack }: OnboardingIndexersProps) {
  const { t } = useLingui();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");

  const createMutation = useCreateModule();

  const select = (type: Selection) => {
    setSelection(type);
    if (type === "prowlarr") setIndexerUrl("http://localhost:9696");
    if (type === "jackett") setIndexerUrl("http://localhost:9117");
    if (type === "prowlarr" || type === "jackett") setIndexerApiKey("");
  };

  const canContinue =
    selection === "torrentio" ||
    ((selection === "prowlarr" || selection === "jackett") && indexerUrl.length > 0 && indexerApiKey.length > 0);

  const handleContinue = () => {
    if (!selection || !canContinue) return;
    if (selection === "torrentio") {
      const catalog = MODULE_CATALOG.find((c) => c.preset === "torrentio");
      const payload = catalog ? buildCreatePayload(catalog) : null;
      if (!payload) return;
      createMutation.mutate(payload, { onSuccess: () => onContinue() });
      return;
    }
    createMutation.mutate(
      { type: selection, config: { url: indexerUrl, apiKey: indexerApiKey } },
      { onSuccess: () => onContinue() },
    );
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
            placeholder={selection === "prowlarr" ? "http://localhost:9696" : "http://localhost:9117"}
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
