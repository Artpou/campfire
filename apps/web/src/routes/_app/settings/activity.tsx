import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsActivityTab } from "@/features/settings/components/settings-activity-tab";

export const Route = createFileRoute("/_app/settings/activity")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "member", { to: "/settings/general" }),
  component: SettingsActivityPage,
});

function SettingsActivityPage() {
  return <SettingsActivityTab />;
}
