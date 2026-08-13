import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { KeyIcon, SaveIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useAuth } from "@/features/auth/auth-store";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";
import { useCompleteOnboarding } from "@/features/onboarding/hooks/use-complete-onboarding";
import { settingsQueries, useUpsertSettings } from "@/features/settings/hooks/settings.queries";
import { UserButtonLetterboxd } from "@/features/user/components/user-button-letterboxd";

interface OnboardingIntegrationsProps {
  onBack: () => void;
}

export function OnboardingIntegrations({ onBack }: OnboardingIntegrationsProps) {
  const user = useAuth((s) => s.user);
  const { data: settings } = useQuery(settingsQueries.get());
  const upsertSettings = useUpsertSettings();
  const complete = useCompleteOnboarding("owner");
  const [tmdbApiKey, setTmdbApiKey] = useState("");
  const [touched, setTouched] = useState(false);

  if (!user) return null;

  const saveTmdb = () => {
    upsertSettings.mutate(
      { tmdbApiKey },
      {
        onSuccess: () => {
          setTouched(false);
          setTmdbApiKey("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          <Trans>Integrations</Trans>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>
            Optional extras — add a TMDB key and import your Letterboxd taste. You can skip and configure later.
          </Trans>
        </p>
      </div>

      <div className="border-border space-y-4 rounded-xl border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <KeyIcon className="size-4" />
          <Trans>TMDB API Key</Trans>
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          <Trans>Required for catalog browse and search if not set in the server environment.</Trans>
        </p>
        {settings?.tmdbApiKey && !touched && (
          <p className="text-muted-foreground font-mono text-xs">{settings.tmdbApiKey}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="password"
            className="flex-1"
            placeholder={settings?.tmdbApiKey ? "••••••••" : "Enter API key"}
            value={tmdbApiKey}
            onChange={(e) => {
              setTmdbApiKey(e.target.value);
              setTouched(true);
            }}
          />
          <Button
            size="sm"
            disabled={!touched || !tmdbApiKey}
            loading={upsertSettings.isPending}
            onClick={saveTmdb}
            icon={SaveIcon}
          >
            <Trans>Save</Trans>
          </Button>
        </div>
        <Label className="text-muted-foreground text-xs">
          <a
            href="https://www.themoviedb.org/settings/api"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            themoviedb.org/settings/api
          </a>
        </Label>
      </div>

      <UserButtonLetterboxd user={user} variant="card" />

      <OnboardingNav
        onBack={onBack}
        onContinue={() => complete.mutate()}
        continueLoading={complete.isPending}
        continueLabel={<Trans>Finish</Trans>}
      />
    </div>
  );
}
