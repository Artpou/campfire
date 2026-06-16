import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, LogOutIcon, SettingsIcon, ShieldIcon, UsersIcon, WrenchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { SettingsActivityTab } from "@/features/settings/components/settings-activity-tab";
import { SettingsAdvancedTab } from "@/features/settings/components/settings-advanced-tab";
import { SettingsGeneralTab } from "@/features/settings/components/settings-general-tab";
import { SettingsIndexersTab } from "@/features/settings/components/settings-indexers-tab";
import { SettingsUsersTab } from "@/features/settings/components/settings-users-tab";

type SettingsTab = "general" | "activity" | "indexers" | "users" | "advanced";

export const Route = createFileRoute("/_app/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);

  const tabs = [
    { id: "general" as const, label: <Trans>General</Trans>, icon: SettingsIcon, adminOnly: false },
    { id: "activity" as const, label: <Trans>Activity</Trans>, icon: ActivityIcon, adminOnly: false },
    { id: "indexers" as const, label: <Trans>Indexers</Trans>, icon: ShieldIcon, adminOnly: true },
    { id: "users" as const, label: <Trans>Users</Trans>, icon: UsersIcon, adminOnly: true },
    { id: "advanced" as const, label: <Trans>Advanced</Trans>, icon: WrenchIcon, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const handleSignOut = async () => {
    try {
      await unwrap(api.auth.logout.$post());
    } catch {
      // continue even if server logout fails
    }
    logout();
    navigate({ to: "/login" });
  };

  return (
    <Container>
      <div className="flex flex-col md:flex-row gap-6 min-h-[60vh]">
        <nav className="md:w-56 shrink-0 flex flex-col">
          <div className="flex md:flex-col gap-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left w-full",
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-auto pt-4 hidden md:block">
            <Button variant="destructive" className="w-full" onClick={handleSignOut}>
              <LogOutIcon className="size-4" />
              <Trans>Sign out</Trans>
            </Button>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "general" && <SettingsGeneralTab />}
          {activeTab === "activity" && <SettingsActivityTab />}
          {activeTab === "indexers" && isAdmin && <SettingsIndexersTab />}
          {activeTab === "users" && isAdmin && <SettingsUsersTab />}
          {activeTab === "advanced" && isAdmin && <SettingsAdvancedTab />}
        </div>

        <div className="md:hidden">
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOutIcon className="size-4" />
            <Trans>Sign out</Trans>
          </Button>
        </div>
      </div>
    </Container>
  );
}
