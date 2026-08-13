import { useState } from "react";

import { api, unwrap } from "@seedarr/sdk";
import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import ms from "ms";

import { useAuth } from "@/features/auth/auth-store";
import { OnboardingAccount } from "@/features/onboarding/components/onboarding-account";
import { OnboardingIndexers } from "@/features/onboarding/components/onboarding-indexers";
import { OnboardingIntegrations } from "@/features/onboarding/components/onboarding-integrations";
import { OnboardingLayout } from "@/features/onboarding/components/onboarding-layout";
import { OnboardingMember } from "@/features/onboarding/components/onboarding-member";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import { OnboardingStorage } from "@/features/onboarding/components/onboarding-storage";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context }) => {
    const { hasOwner } = await unwrap(api.auth["has-owner"].$get());

    try {
      const user = await context.queryClient.ensureQueryData({
        queryKey: ["auth", "me"],
        queryFn: () => unwrap(api.auth.me.$get()),
        staleTime: ms("5m"),
      });
      useAuth.getState().setUser(user);

      if (user.onboarded) {
        throw redirect({ to: "/" });
      }

      return { user, hasOwner: true };
    } catch (err) {
      if (isRedirect(err)) throw err;

      useAuth.getState().setUser(null);
      context.queryClient.removeQueries({ queryKey: ["auth", "me"] });

      if (hasOwner) {
        throw redirect({ to: "/login" });
      }

      return { user: null, hasOwner: false };
    }
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const user = useAuth((s) => s.user);
  const isOwner = !user || user.role === "owner";

  return <OnboardingLayout>{isOwner ? <OwnerOnboarding /> : <OnboardingMember />}</OnboardingLayout>;
}

function OwnerOnboarding() {
  const [step, setStep] = useState(0);

  return (
    <div className="space-y-8">
      <OnboardingStepper currentStep={step} />

      {step === 0 && <OnboardingAccount onContinue={() => setStep(1)} />}
      {step === 1 && <OnboardingIndexers onContinue={() => setStep(2)} onBack={() => setStep(0)} />}
      {step === 2 && <OnboardingStorage onContinue={() => setStep(3)} onBack={() => setStep(1)} />}
      {step === 3 && <OnboardingIntegrations onBack={() => setStep(2)} />}
    </div>
  );
}
