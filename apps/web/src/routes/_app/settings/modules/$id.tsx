import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { ModuleConfig } from "@/features/module/components/config/module-config";

export const Route = createFileRoute("/_app/settings/modules/$id")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  component: ModuleEditRoute,
});

function ModuleEditRoute() {
  const { id } = Route.useParams();
  return <ModuleConfig moduleId={id} />;
}
