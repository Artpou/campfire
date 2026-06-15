import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerManagerWithIndexers, IndexerType } from "@seedarr/sdk";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { TorrentioProviderPicker } from "@/features/indexers-manager/components/torrentio-provider-picker";
import { INDEXER_DEFAULTS } from "@/features/indexers-manager/indexers-manager";

interface IndexersManagerAddDialogProps {
  managers: IndexerManagerWithIndexers[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTorrentio: boolean;
  onSubmit: (data: {
    indexerType: IndexerType;
    indexerUrl?: string;
    indexerApiKey?: string;
    providers?: string[];
  }) => void;
  isPending: boolean;
}

export function IndexersManagerAddDialog({
  managers,
  open,
  onOpenChange,
  hasTorrentio,
  onSubmit,
  isPending,
}: IndexersManagerAddDialogProps) {
  const { t } = useLingui();
  const [step, setStep] = useState<"type" | "config">("type");
  const [indexerType, setIndexerType] = useState<IndexerType>("jackett");
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");
  const [providers, setProviders] = useState<Set<string>>(
    new Set(managers.find((m) => m.indexerType === "torrentio")?.indexers.map((i) => i.name) ?? []),
  );

  const reset = () => {
    setStep("type");
    setIndexerType("jackett");
    setIndexerUrl("");
    setIndexerApiKey("");
    setProviders(new Set());
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

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
      onSubmit({ indexerType, providers: Array.from(providers) });
    } else {
      onSubmit({ indexerType, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit =
    indexerType === "torrentio" ? providers.size > 0 : indexerUrl.length > 0 && indexerApiKey.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={indexerType === "torrentio" && step === "config" ? "max-w-2xl" : undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {step === "type" ? <Trans>Add Indexer Manager</Trans> : <Trans>Configure {indexerType}</Trans>}
          </DialogTitle>
          <DialogDescription>
            {step === "type" ? (
              <Trans>Choose the type of indexer to add.</Trans>
            ) : indexerType === "torrentio" ? (
              <Trans>Select the providers you want to use.</Trans>
            ) : (
              <Trans>Enter the URL and API key for your instance.</Trans>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "type" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
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
              className={`p-4 rounded-md border transition-colors text-left ${
                hasTorrentio
                  ? "border-border/50 opacity-50 cursor-not-allowed"
                  : "border-border hover:border-primary hover:bg-primary/5"
              }`}
              onClick={() => !hasTorrentio && handleSelectType("torrentio")}
              disabled={hasTorrentio}
            >
              <p className="font-semibold">Torrentio</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasTorrentio ? <Trans>Already configured</Trans> : <Trans>Stremio addon for torrents</Trans>}
              </p>
            </button>
          </div>
        ) : indexerType === "torrentio" ? (
          <TorrentioProviderPicker selected={providers} onToggle={toggleProvider} />
        ) : (
          <div className="space-y-4 py-2">
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

        {step === "config" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("type")}>
              <Trans>Back</Trans>
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
              <Trans>Save</Trans>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
