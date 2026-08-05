import { useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { CreateIndexerManagerInput } from "@seedarr/contracts";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { INDEXER_DEFAULTS, STREMIO_PRESETS } from "@/features/indexers-manager/indexers-manager";

type FormType = "STREMIO_ADDON" | "SELF_HOSTED" | "PRESET";

interface IndexersManagerAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateIndexerManagerInput) => void;
  isPending: boolean;
}

export function IndexersManagerAddDialog({ open, onOpenChange, onSubmit, isPending }: IndexersManagerAddDialogProps) {
  const { t } = useLingui();
  const [formType, setFormType] = useState<FormType>("STREMIO_ADDON");

  const [selfHostedType, setSelfHostedType] = useState<"jackett" | "prowlarr">("jackett");
  const [indexerUrl, setIndexerUrl] = useState("");
  const [indexerApiKey, setIndexerApiKey] = useState("");
  const [manifestUrl, setManifestUrl] = useState("");

  const reset = () => {
    setFormType("STREMIO_ADDON");
    setSelfHostedType("jackett");
    setIndexerUrl("");
    setIndexerApiKey("");
    setManifestUrl("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTabChange = (value: string) => {
    const type = value as FormType;
    setFormType(type);
    if (type === "SELF_HOSTED") {
      setIndexerUrl(INDEXER_DEFAULTS[selfHostedType] ?? "");
    }
  };

  const handleSelfHostedTypeChange = (type: "jackett" | "prowlarr") => {
    setSelfHostedType(type);
    setIndexerUrl(INDEXER_DEFAULTS[type] ?? "");
  };

  const handlePresetSelect = (preset: "torrentio" | "comet" | "mediafusion") => {
    onSubmit({ type: "PRESET", preset });
  };

  const handleSubmit = () => {
    if (formType === "SELF_HOSTED") {
      onSubmit({ type: "SELF_HOSTED", indexerType: selfHostedType, indexerUrl, indexerApiKey });
    } else if (formType === "STREMIO_ADDON") {
      onSubmit({ type: "STREMIO_ADDON", manifestUrl });
    }
  };

  const canSubmit = (() => {
    if (formType === "SELF_HOSTED") return indexerUrl.length > 0 && indexerApiKey.length > 0;
    if (formType === "STREMIO_ADDON") return manifestUrl.length > 0;
    return false;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            <Trans>Add New Indexer</Trans>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={formType} onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="STREMIO_ADDON" className="flex-1">
              <Trans>Custom Stremio Addon</Trans>
            </TabsTrigger>
            <TabsTrigger value="SELF_HOSTED" className="flex-1">
              <Trans>Self-Hosted</Trans>
            </TabsTrigger>
            <TabsTrigger value="PRESET" className="flex-1">
              <Trans>Presets</Trans>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="STREMIO_ADDON">
            <Input
              label={<Trans>Manifest URL</Trans>}
              placeholder="https://torrentio.strem.fun/manifest.json"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="SELF_HOSTED" className="space-y-4">
            <Tabs
              value={selfHostedType}
              onValueChange={(value) => handleSelfHostedTypeChange(value as "jackett" | "prowlarr")}
            >
              <TabsList>
                <TabsTrigger value="jackett">Jackett</TabsTrigger>
                <TabsTrigger value="prowlarr">Prowlarr</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              label={<Trans>Base URL</Trans>}
              placeholder={INDEXER_DEFAULTS[selfHostedType]}
              value={indexerUrl}
              onChange={(e) => setIndexerUrl(e.target.value)}
            />
            <Input
              label={<Trans>API Key</Trans>}
              placeholder={t(msg`Enter your API key...`)}
              value={indexerApiKey}
              onChange={(e) => setIndexerApiKey(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="PRESET" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <Trans>Choose a pre-configured provider:</Trans>
            </p>
            {STREMIO_PRESETS.map((preset) => (
              <div key={preset.value} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{preset.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{preset.label}</p>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePresetSelect(preset.value)}
                  disabled={isPending}
                >
                  <Trans>Select</Trans>
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {formType !== "PRESET" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              <Trans>Cancel</Trans>
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
