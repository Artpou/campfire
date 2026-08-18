import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/storage")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/modules" });
  },
});
