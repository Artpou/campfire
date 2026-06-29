import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, HardDriveIcon, LogOutIcon, RssIcon, SettingsIcon, UsersIcon, WrenchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { AppVersionBadge } from "@/features/settings/components/app-version-badge";
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
  const queryClient = useQueryClient();
  const logout = useAuth((s) => s.logout);

  const tabs = [
    { id: "general" as const, label: <Trans>General</Trans>, icon: SettingsIcon, adminOnly: false },
    { id: "indexers" as const, label: <Trans>Indexers</Trans>, icon: RssIcon, adminOnly: true },
    { id: "activity" as const, label: <Trans>Activity</Trans>, icon: ActivityIcon, adminOnly: false },
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
    queryClient.clear();
    navigate({ to: "/login" });
  };

  return (
    <Container>
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-64 shrink-0 flex flex-col md:sticky md:top-6 md:self-start md:h-[85vh]">
          <div className="flex md:flex-col gap-1 flex-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors text-left w-full",
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <tab.icon className="size-5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex flex-col gap-3 mt-6">
            <Card className="py-4 gap-0">
              <CardContent className="flex items-center gap-4 px-4">
                <HardDriveIcon />
                <div>
                  <p className="font-semibold">seedarr</p>
                  <AppVersionBadge />
                </div>
              </CardContent>
            </Card>

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

        <div className="md:hidden space-y-4">
          <Card className="py-4 gap-0">
            <CardContent className="flex items-center gap-2">
              <img src="/logo.svg" alt="Seedarr" className="size-8 shrink-0" />
              <div>
                <p className="font-semibold">seedarr</p>
                <AppVersionBadge />
              </div>
            </CardContent>
          </Card>

          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOutIcon className="size-4" />
            <Trans>Sign out</Trans>
          </Button>
        </div>
      </div>
    </Container>
  );
}
