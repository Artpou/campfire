import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { FileIcon, GlobeIcon, KeyIcon, PaletteIcon, SaveIcon } from "lucide-react";

import { SelectI18nLang } from "@/shared/components/select/select-i18n-lang";
import { SelectQuality } from "@/shared/components/select/select-quality";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useRole } from "@/features/auth/hooks/use-role";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { PasswordChangeModal } from "@/features/user/components/password-change-modal";
import { settingsQueries, useUpsertSettings } from "../hooks/settings.queries";

export function SettingsGeneralTab() {
  const { isAdmin } = useRole();
  const quality = useUserPreferences((s) => s.quality);
  const maxSize = useUserPreferences((s) => s.maxSize);
  const setQuality = useUserPreferences((s) => s.setQuality);
  const setMaxSize = useUserPreferences((s) => s.setMaxSize);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <section className="space-y-6">
      <h2>
        <Trans>General</Trans>
      </h2>

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <PaletteIcon className="size-4" />
          <Trans>Appearance</Trans>
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label>
              <Trans>Language</Trans>
            </Label>
            <p className="text-sm text-muted-foreground">
              <Trans>Interface language for Seedarr.</Trans>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlobeIcon className="size-4 text-muted-foreground" />
            <SelectI18nLang />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <KeyIcon className="size-4" />
          <Trans>Password</Trans>
        </h3>
        <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
          <Trans>Change Password</Trans>
        </Button>
      </div>

      {isAdmin && <TmdbApiKeySection />}

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <FileIcon className="size-4" />
          <Trans>Torrents</Trans>
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label>
              <Trans>Default quality</Trans>
            </Label>
            <p className="text-sm text-muted-foreground">
              <Trans>Minimum quality filter applied when searching torrents.</Trans>
            </p>
          </div>
          <SelectQuality value={quality} onValueChange={setQuality} triggerClassName="w-36" />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="max-size">
              <Trans>Max torrent size</Trans>
            </Label>
            <p className="text-sm text-muted-foreground">
              <Trans>Hide torrents larger than this size. Leave empty for no limit.</Trans>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="max-size"
              type="number"
              min={0}
              step={0.1}
              className="w-24"
              placeholder="—"
              value={maxSize ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setMaxSize(value === "" ? null : Number(value));
              }}
            />
            <span className="text-sm text-muted-foreground">GB</span>
          </div>
        </div>
      </div>

      <PasswordChangeModal open={passwordOpen} onOpenChange={setPasswordOpen} />
    </section>
  );
}

function TmdbApiKeySection() {
  const { data: settings } = useQuery(settingsQueries.get());
  const upsertSettings = useUpsertSettings();
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [touched, setTouched] = useState(false);

  const handleSave = () => {
    upsertSettings.mutate({ tmdbApiKey }, { onSuccess: () => setTouched(false) });
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="flex items-center gap-3">
        <KeyIcon className="size-4" />
        <Trans>API Keys</Trans>
      </h3>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="tmdb-api-key">
            <Trans>TMDB API Key (v3)</Trans>
          </Label>
          <p className="text-sm text-muted-foreground">
            <Trans>Required for remote media synchronization. Get one at themoviedb.org.</Trans>
          </p>
          {settings?.tmdbApiKey && !touched && (
            <p className="text-xs text-muted-foreground font-mono">{settings.tmdbApiKey}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="tmdb-api-key"
            type="password"
            className="w-64"
            placeholder={settings?.tmdbApiKey ? "••••••••" : "Enter API key"}
            value={tmdbApiKey}
            onChange={(e) => {
              setTmdbApiKey(e.target.value);
              setTouched(true);
            }}
          />
          <Button size="sm" disabled={!touched} loading={upsertSettings.isPending} onClick={handleSave} icon={SaveIcon}>
            <Trans>Save</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
