import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/signup")({
  beforeLoad: async () => {
    throw redirect({ to: "/onboarding" });
  },
  component: () => null,
});
