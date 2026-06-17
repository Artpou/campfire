import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerManager } from "@seedarr/sdk";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { INDEXER_DEFAULTS } from "@/features/indexers-manager/indexers-manager";

interface IndexersManagerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manager: IndexerManager | null;
  onSubmit: (data: { id: string; indexerUrl?: string; indexerApiKey?: string; manifestUrl?: string }) => void;
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
  const [manifestUrl, setManifestUrl] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (next && manager) {
      setIndexerUrl(manager.indexerUrl ?? "");
      setIndexerApiKey(manager.indexerApiKey ?? "");
      if (manager.indexerType === "stremio") {
        const url = manager.indexerUrl ? `${manager.indexerUrl}/manifest.json` : "";
        setManifestUrl(url);
      }
    }
    onOpenChange(next);
  };

  if (!manager) return null;

  const handleSubmit = () => {
    if (manager.indexerType === "stremio") {
      onSubmit({ id: manager.id, manifestUrl });
    } else {
      onSubmit({ id: manager.id, indexerUrl, indexerApiKey });
    }
  };

  const canSubmit =
    manager.indexerType === "stremio" ? manifestUrl.length > 0 : indexerUrl.length > 0 && indexerApiKey.length > 0;

  const displayName =
    manager.indexerType === "stremio" ? (manager.manifest?.name ?? "Stremio Addon") : manager.indexerType;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans>Edit {displayName}</Trans>
          </DialogTitle>
        </DialogHeader>

        {manager.indexerType === "stremio" ? (
          <div className="space-y-4 py-2">
            <Input
              label={<Trans>Manifest URL</Trans>}
              placeholder="https://torrentio.strem.fun/manifest.json"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
            />
          </div>
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
