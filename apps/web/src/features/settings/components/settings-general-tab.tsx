import { Trans } from "@lingui/react/macro";
import { MoonIcon, SunIcon } from "lucide-react";

import { useTheme } from "@/shared/hooks/use-theme";
import { LanguageDropdown } from "@/shared/language-dropdown";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { QUALITY_LEVELS } from "@/features/settings/constants/torrent-preferences";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";

export function SettingsGeneralTab() {
  const { theme, toggleTheme } = useTheme();
  const quality = useUserPreferences((s) => s.quality);
  const maxSize = useUserPreferences((s) => s.maxSize);
  const setQuality = useUserPreferences((s) => s.setQuality);
  const setMaxSize = useUserPreferences((s) => s.setMaxSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Preferences</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>Customize your Seedarr experience.</Trans>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>
                <Trans>Language</Trans>
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans>Choose your preferred language and region.</Trans>
              </p>
            </div>
            <LanguageDropdown />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>
                <Trans>Theme</Trans>
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans>Switch between light and dark mode.</Trans>
              </p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
              {theme === "dark" ? <Trans>Light mode</Trans> : <Trans>Dark mode</Trans>}
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label>
                <Trans>Default quality</Trans>
              </Label>
              <p className="text-sm text-muted-foreground">
                <Trans>Minimum quality filter applied when searching torrents.</Trans>
              </p>
            </div>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUALITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level === "all" ? <Trans>All qualities</Trans> : level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>
    </div>
  );
}
