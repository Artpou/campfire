import { useState } from "react";

import { Trans } from "@lingui/react/macro";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

import { useCreateModule } from "@/features/module/hooks/module.queries";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";

type StorageProtocol = "webdav" | "ftp";

interface OnboardingStorageProps {
  onContinue: () => void;
  onBack: () => void;
}

export function OnboardingStorage({ onContinue, onBack }: OnboardingStorageProps) {
  const [protocol, setProtocol] = useState<StorageProtocol>("webdav");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(443);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [moviePath, setMoviePath] = useState("");
  const [tvPath, setTvPath] = useState("");
  const [autoTransfer, setAutoTransfer] = useState(false);
  const createMutation = useCreateModule();

  const selectProtocol = (next: StorageProtocol) => {
    setProtocol(next);
    setPort(next === "webdav" ? 443 : 21);
  };

  const canSave = host.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const config = {
      host: host.trim(),
      port,
      username: username.trim() || undefined,
      password: password || undefined,
      moviePath: moviePath.trim() || undefined,
      tvPath: tvPath.trim() || undefined,
      autoTransfer,
      secure: protocol === "webdav",
    };
    createMutation.mutate(
      protocol === "webdav" ? { type: "webdav" as const, config } : { type: "ftp" as const, config },
      { onSuccess: () => onContinue() },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          <Trans>Remote storage</Trans>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>Optionally connect FTP or WebDAV to move completed downloads to a NAS or cloud folder.</Trans>
        </p>
      </div>

      <ResponsiveTabs
        value={protocol}
        onValueChange={(v) => selectProtocol(v as StorageProtocol)}
        options={[
          { value: "webdav", label: <Trans>WebDAV</Trans> },
          { value: "ftp", label: <Trans>FTP</Trans> },
        ]}
      />

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            classNameWrapper="w-full"
            label={<Trans>Host</Trans>}
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
          <Input
            classNameWrapper="sm:w-32 w-full"
            label={<Trans>Port</Trans>}
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            classNameWrapper="flex-1"
            label={<Trans>Username</Trans>}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            classNameWrapper="flex-1"
            label={<Trans>Password</Trans>}
            password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Input label={<Trans>Movie path</Trans>} value={moviePath} onChange={(e) => setMoviePath(e.target.value)} />
        <Input label={<Trans>TV path</Trans>} value={tvPath} onChange={(e) => setTvPath(e.target.value)} />
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label>
              <Trans>Auto transfer</Trans>
            </Label>
            <p className="text-sm text-muted-foreground">
              <Trans>Automatically move completed downloads to remote storage.</Trans>
            </p>
          </div>
          <Switch checked={autoTransfer} onCheckedChange={setAutoTransfer} />
        </div>
      </div>

      <OnboardingNav
        onBack={onBack}
        onContinue={save}
        continueLabel={<Trans>Save & continue</Trans>}
        continueLoading={createMutation.isPending}
        continueDisabled={!canSave}
        rightExtra={
          <Button size="lg" variant="outline" onClick={onContinue}>
            <Trans>Skip</Trans>
          </Button>
        }
      />
    </div>
  );
}
