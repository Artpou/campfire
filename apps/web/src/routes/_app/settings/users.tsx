import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsUsersTab } from "@/features/settings/components/settings-users-tab";

export const Route = createFileRoute("/_app/settings/users")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  component: SettingsUsersPage,
});

function SettingsUsersPage() {
  return <SettingsUsersTab />;
}
