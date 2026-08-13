import { Trans } from "@lingui/react/macro";

import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";
import { SettingsStorageTab } from "@/features/settings/components/settings-storage-tab";

interface OnboardingStorageProps {
  onContinue: () => void;
  onBack: () => void;
}

export function OnboardingStorage({ onContinue, onBack }: OnboardingStorageProps) {
  return (
    <div className="space-y-6">
      <SettingsStorageTab
        titleAddon={
          <span className="text-muted-foreground text-sm font-normal">
            (<Trans>optional</Trans>)
          </span>
        }
        hideOptions
      />
      <OnboardingNav onBack={onBack} onContinue={onContinue} />
    </div>
  );
}
