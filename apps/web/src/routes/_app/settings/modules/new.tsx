import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { ModuleNewView } from "@/features/module/components/module-new-view";

export const Route = createFileRoute("/_app/settings/modules/new")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  validateSearch: (search: Record<string, unknown>) => ({
    type: search.type === "stremio" ? ("stremio" as const) : ("stremio" as const),
  }),
  component: ModuleNewView,
});
