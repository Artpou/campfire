import { createFileRoute } from "@tanstack/react-router";

import { SettingsGeneralView } from "@/features/settings/components/settings-general-view";

export const Route = createFileRoute("/_app/settings/general")({
  component: SettingsGeneralView,
});
