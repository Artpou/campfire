import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OnboardingLayout } from "@/features/onboarding/components/onboarding-layout";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <OnboardingLayout>
      <Outlet />
    </OnboardingLayout>
  );
}
