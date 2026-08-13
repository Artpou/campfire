import { Trans } from "@lingui/react/macro";

import { cn } from "@/lib/utils";

const OWNER_STEPS = [
  { id: "account", label: <Trans>Account</Trans> },
  { id: "indexers", label: <Trans>Indexers</Trans> },
  { id: "storage", label: <Trans>Storage</Trans> },
  { id: "integrations", label: <Trans>Integrations</Trans> },
] as const;

interface OnboardingStepperProps {
  currentStep: number;
}

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-3">
      {OWNER_STEPS.map((step, index) => {
        const active = index === currentStep;
        const done = index < currentStep;
        return (
          <li key={step.id} className="flex items-center gap-2">
            {index > 0 && <span className="bg-border hidden h-px w-4 sm:block" aria-hidden />}
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                active && "bg-primary text-primary-foreground",
                done && "bg-primary/15 text-primary",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              <span className="tabular-nums">{index + 1}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
