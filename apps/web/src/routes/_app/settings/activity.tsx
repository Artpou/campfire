import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsActivityView } from "@/features/settings/components/settings-activity-view";

export const Route = createFileRoute("/_app/settings/activity")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "member", { to: "/settings/general" }),
  component: SettingsActivityView,
});
