import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsIndexersTab } from "@/features/settings/components/settings-indexers-tab";

export const Route = createFileRoute("/_app/settings/indexers")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  component: SettingsIndexersPage,
});

function SettingsIndexersPage() {
  return <SettingsIndexersTab />;
}
