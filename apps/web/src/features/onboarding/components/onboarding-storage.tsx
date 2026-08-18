import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";

import { Button } from "@/shared/ui/button";

import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";

interface OnboardingStorageProps {
  onContinue: () => void;
  onBack: () => void;
}

export function OnboardingStorage({ onContinue, onBack }: OnboardingStorageProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        <Trans>Remote storage (FTP / WebDAV) can be configured later under Settings → Modules.</Trans>
      </p>
      <Button variant="secondary" asChild>
        <Link to="/settings/modules" search={{ tab: "storage" }}>
          <Trans>Open Modules</Trans>
        </Link>
      </Button>
      <OnboardingNav onBack={onBack} onContinue={onContinue} />
    </div>
  );
}
