import { Trans } from "@lingui/react/macro";

import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { OnboardingLanguage } from "@/features/onboarding/components/onboarding-language";
import { OnboardingNav } from "@/features/onboarding/components/onboarding-nav";
import { useCompleteOnboarding } from "@/features/onboarding/hooks/use-complete-onboarding";
import { UserButtonLetterboxd } from "@/features/user/components/user-button-letterboxd";

export function OnboardingMember() {
  const user = useAuth((s) => s.user);
  const complete = useCompleteOnboarding("member");

  if (!user) return null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          <Trans>Welcome, {user.username}</Trans>
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <Trans>Pick your language and optionally import your Letterboxd watchlist. You can change this later.</Trans>
        </p>
      </div>

      <OnboardingLanguage />

      <UserButtonLetterboxd user={user} variant="card" />

      <OnboardingNav
        hideBack
        onContinue={() => complete.mutate()}
        continueLoading={complete.isPending}
        continueLabel={<Trans>Get started</Trans>}
        rightExtra={
          <Button
            type="button"
            variant="outline"
            className="text-muted-foreground"
            loading={complete.isPending}
            onClick={() => complete.mutate()}
          >
            <Trans>Skip</Trans>
          </Button>
        }
      />
    </div>
  );
}
