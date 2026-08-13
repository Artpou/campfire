import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";

import { Button } from "@/shared/ui/button";

interface OnboardingNavProps {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: ReactNode;
  continueLoading?: boolean;
  continueDisabled?: boolean;
  withSkip?: boolean;
  hideBack?: boolean;
  rightExtra?: ReactNode;
}

export function OnboardingNav({
  onBack,
  onContinue,
  continueLabel,
  continueLoading,
  continueDisabled,
  hideBack,
  rightExtra,
}: OnboardingNavProps) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      {hideBack ? (
        <span />
      ) : (
        <Button size="lg" type="button" variant="outline" onClick={onBack} disabled={!onBack}>
          <Trans>Back</Trans>
        </Button>
      )}
      <div className="flex items-center gap-2">
        {rightExtra}
        <Button size="lg" type="button" loading={continueLoading} disabled={continueDisabled} onClick={onContinue}>
          {continueLabel ?? <Trans>Continue</Trans>}
        </Button>
      </div>
    </div>
  );
}
