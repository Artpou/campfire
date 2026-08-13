import { createFileRoute } from "@tanstack/react-router";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";

import { SettingsStorageTab } from "@/features/settings/components/settings-storage-tab";

export const Route = createFileRoute("/_app/settings/storage")({
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  component: SettingsStoragePage,
});

function SettingsStoragePage() {
  return <SettingsStorageTab />;
}
