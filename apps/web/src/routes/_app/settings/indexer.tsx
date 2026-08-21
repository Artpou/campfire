import { createFileRoute, redirect } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

export const Route = createFileRoute("/_app/settings/indexer")({
  beforeLoad: ({ context }) => {
    redirectIfNotRole(context, "admin", { to: "/settings/general" });
    throw redirect({ to: "/settings/modules", search: { tab: "indexer" } });
  },
});
