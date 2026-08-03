import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { FileIcon, GlobeIcon, KeyIcon, Loader2Icon, MoonIcon, PaletteIcon, SaveIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/shared/hooks/use-theme";
import { LanguageDropdown } from "@/shared/language-dropdown";
import { SelectQuality } from "@/shared/reusable/select/select-quality";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useRole } from "@/features/auth/hooks/use-role";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { settingsQueries, useUpsertSettings } from "../hooks/settings.queries";

export function SettingsGeneralTab() {
  const { theme, toggleTheme } = useTheme();
  const { isAdmin } = useRole();
  const quality = useUserPreferences((s) => s.quality);
  const maxSize = useUserPreferences((s) => s.maxSize);
  const setQuality = useUserPreferences((s) => s.setQuality);
  const setMaxSize = useUserPreferences((s) => s.setMaxSize);

  return (
    <section className="space-y-6">
      <h2>
        <Trans>General</Trans>
      </h2>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <GlobeIcon className="size-4" />
          <Trans>Language</Trans>
        </h3>
        <LanguageDropdown />
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <PaletteIcon className="size-4" />
          <Trans>Theme</Trans>
        </h3>
        <Button variant="secondary" onClick={toggleTheme}>
          {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          {theme === "dark" ? <Trans>Light mode</Trans> : <Trans>Dark mode</Trans>}
        </Button>
      </div>

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

      {isAdmin && <TmdbApiKeySection />}
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
          <Button size="sm" disabled={!touched || upsertSettings.isPending} onClick={handleSave}>
            {upsertSettings.isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SaveIcon className="size-4" />
            )}
            <Trans>Save</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
