import { createFileRoute } from "@tanstack/react-router";

import { SettingsGeneralTab } from "@/features/settings/components/settings-general-tab";

export const Route = createFileRoute("/_app/settings/general")({
  component: SettingsGeneralPage,
});

function SettingsGeneralPage() {
  return <SettingsGeneralTab />;
}
