import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsUsersView } from "@/features/settings/components/settings-users-view";

export const Route = createFileRoute("/_app/settings/users")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  component: SettingsUsersView,
});
