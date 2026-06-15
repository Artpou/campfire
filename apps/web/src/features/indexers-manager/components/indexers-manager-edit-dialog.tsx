import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerManagerWithIndexers } from "@seedarr/sdk";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { TorrentioProviderPicker } from "@/features/indexers-manager/components/torrentio-provider-picker";
import { INDEXER_DEFAULTS } from "@/features/indexers-manager/indexers-manager";

interface IndexersManagerEditDialogProps {
  managers: IndexerManagerWithIndexers[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: IndexerManagerWithIndexers | null;
  mode?: "add" | "edit";
  onSubmit: (data: { id: string; indexerUrl?: string; indexerApiKey?: string; providers?: string[] }) => void;
  isPending: boolean;
}

export function IndexersManagerEditDialog({
  managers,
  open,
  onOpenChange,
  manager,
  mode = "edit",
  onSubmit,
  isPending,
}: IndexersManagerEditDialogProps) {
  const { t } = useLingui();
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");
  const [providers, setProviders] = useState<Set<string>>(
    new Set(managers.find((m) => m.indexerType === "torrentio")?.indexers.map((i) => i.name) ?? []),
  );

  const handleOpenChange = (next: boolean) => {
    if (next && manager) {
      setIndexerUrl(manager.indexerUrl ?? "");
      setIndexerApiKey(manager.indexerApiKey ?? "");
      if (manager.indexerType === "torrentio") {
        if (mode === "add") {
          setProviders(new Set());
        } else {
          setProviders(new Set(manager.indexers.map((i) => i.name)));
        }
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
    if (manager.indexerType === "torrentio") {
      const existing = manager.indexers.map((i) => i.name);
      const merged = mode === "add" ? [...existing, ...Array.from(providers)] : Array.from(providers);
      onSubmit({ id: manager.id, providers: merged });
    } else {
      onSubmit({ id: manager.id, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit =
    manager.indexerType === "torrentio"
      ? mode === "add"
        ? providers.size > 0
        : providers.size > 0
      : indexerUrl.length > 0 && indexerApiKey.length > 0;

  const excludeProviders =
    manager.indexerType === "torrentio" && mode === "add" ? new Set(manager.indexers.map((i) => i.name)) : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {manager.indexerType === "torrentio" && mode === "add" ? (
              <Trans>Add Torrentio indexers</Trans>
            ) : (
              <Trans>Edit {manager.indexerType}</Trans>
            )}
          </DialogTitle>
        </DialogHeader>

        {manager.indexerType === "torrentio" ? (
          <TorrentioProviderPicker selected={providers} onToggle={toggleProvider} exclude={excludeProviders} />
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
