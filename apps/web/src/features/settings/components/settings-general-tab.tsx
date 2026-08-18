import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FileIcon, GlobeIcon, KeyIcon, LogOutIcon, PaletteIcon } from "lucide-react";

import { SelectI18nLang } from "@/shared/components/select/select-i18n-lang";
import { SelectQuality } from "@/shared/components/select/select-quality";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useAuth } from "@/features/auth/auth-store";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { PasswordChangeModal } from "@/features/user/components/password-change-modal";

export function SettingsGeneralTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useAuth((s) => s.logout);
  const quality = useUserPreferences((s) => s.quality);
  const maxSize = useUserPreferences((s) => s.maxSize);
  const setQuality = useUserPreferences((s) => s.setQuality);
  const setMaxSize = useUserPreferences((s) => s.setMaxSize);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await unwrap(api.auth.logout.$post());
    } catch {
      // continue even if server logout fails
    }
    logout();
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <PaletteIcon className="size-4" />
          <Trans>Appearance</Trans>
        </h3>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Label>
              <Trans>Language</Trans>
            </Label>
            <p className="hidden md:block text-sm text-muted-foreground">
              <Trans>Interface language for Seedarr.</Trans>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlobeIcon className="size-4 text-muted-foreground" />
            <SelectI18nLang />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <KeyIcon className="size-4" />
          <Trans>Password</Trans>
        </h3>
        <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
          <Trans>Change Password</Trans>
        </Button>
      </div>

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <FileIcon className="size-4" />
          <Trans>Torrents</Trans>
        </h3>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Label>
              <Trans>Default quality</Trans>
            </Label>
            <p className="hidden md:block text-sm text-muted-foreground">
              <Trans>Minimum quality filter applied when searching torrents.</Trans>
            </p>
          </div>
          <SelectQuality value={quality} onValueChange={setQuality} triggerClassName="w-full md:w-36" />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Label htmlFor="max-size">
              <Trans>Max torrent size</Trans>
            </Label>
            <p className="hidden md:block text-sm text-muted-foreground">
              <Trans>Hide torrents larger than this size. Leave empty for no limit.</Trans>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="max-size"
              type="number"
              min={0}
              step={0.1}
              className="w-full md:w-24"
              placeholder="—"
              value={maxSize ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setMaxSize(value === "" ? null : Number(value));
              }}
            />
            <span className="text-sm text-muted-foreground shrink-0">GB</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end border rounded-md p-4">
        <Button variant="destructive" onClick={handleSignOut} icon={LogOutIcon}>
          <Trans>Sign out</Trans>
        </Button>
      </div>

      <PasswordChangeModal open={passwordOpen} onOpenChange={setPasswordOpen} />
    </section>
  );
}
