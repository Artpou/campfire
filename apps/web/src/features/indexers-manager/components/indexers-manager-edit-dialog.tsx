import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerManager } from "@seedarr/sdk";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { TorrentioProviderPicker } from "@/features/indexers-manager/components/torrentio-provider-picker";
import { INDEXER_DEFAULTS, parseStremioProviders } from "@/features/indexers-manager/indexers-manager";

interface IndexersManagerEditDialogProps {
  managers: IndexerManager[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: IndexerManager | null;
  onSubmit: (data: { id: string; indexerUrl?: string; indexerApiKey?: string; providers?: string[] }) => void;
  isPending: boolean;
}

export function IndexersManagerEditDialog({
  open,
  onOpenChange,
  manager,
  onSubmit,
  isPending,
}: IndexersManagerEditDialogProps) {
  const { t } = useLingui();
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");
  const [providers, setProviders] = useState<Set<string>>(new Set());

  const handleOpenChange = (next: boolean) => {
    if (next && manager) {
      setIndexerUrl(manager.indexerUrl ?? "");
      setIndexerApiKey(manager.indexerApiKey ?? "");
      if (manager.indexerType === "stremio") {
        setProviders(new Set(parseStremioProviders(manager.indexerUrl)));
      }
    }
    onOpenChange(next);
  };

  if (!manager) return null;

  const toggleProvider = (value: string) => {
    setProviders((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSubmit = () => {
    if (manager.indexerType === "stremio") {
      onSubmit({ id: manager.id, providers: Array.from(providers) });
    } else {
      onSubmit({ id: manager.id, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit =
    manager.indexerType === "stremio" ? providers.size > 0 : indexerUrl.length > 0 && indexerApiKey.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            <Trans>Edit {manager.indexerType === "stremio" ? "Torrentio" : manager.indexerType}</Trans>
          </DialogTitle>
        </DialogHeader>

        {manager.indexerType === "stremio" ? (
          <TorrentioProviderPicker selected={providers} onToggle={toggleProvider} />
        ) : (
          <div className="space-y-4 py-2">
            <Input
              label={<Trans>URL</Trans>}
              placeholder={INDEXER_DEFAULTS[manager.indexerType]}
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

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              <Trans>Cancel</Trans>
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            <Trans>Save</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
