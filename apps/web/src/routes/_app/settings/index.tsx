import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, HardDriveIcon, LogOutIcon, RssIcon, ServerIcon, SettingsIcon, UsersIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { AppVersionBadge } from "@/features/settings/components/app-version-badge";
import { SettingsActivityTab } from "@/features/settings/components/settings-activity-tab";
import { SettingsGeneralTab } from "@/features/settings/components/settings-general-tab";
import { SettingsIndexersTab } from "@/features/settings/components/settings-indexers-tab";
import { SettingsStorageTab } from "@/features/settings/components/settings-storage-tab";
import { SettingsUsersTab } from "@/features/settings/components/settings-users-tab";

type SettingsTab = "general" | "activity" | "indexers" | "storage" | "users" | "advanced";

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
    { id: "storage" as const, label: <Trans>Storage</Trans>, icon: ServerIcon, adminOnly: true },
    { id: "activity" as const, label: <Trans>Activity</Trans>, icon: ActivityIcon, adminOnly: false },
    { id: "users" as const, label: <Trans>Users</Trans>, icon: UsersIcon, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);
  const activeTabMeta = visibleTabs.find((tab) => tab.id === activeTab) ?? visibleTabs[0];

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
    <Container className="pb-3 sm:pb-6">
      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-64 shrink-0 flex flex-col md:sticky md:top-6 md:self-start md:h-[85vh]">
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)}>
              <SelectTrigger className="w-full h-11">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    {activeTabMeta && <activeTabMeta.icon className="size-4" />}
                    {activeTabMeta?.label}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {visibleTabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>
                    <span className="flex items-center gap-2">
                      <tab.icon className="size-4" />
                      {tab.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs className="hidden md:flex md:flex-col flex-1">
            <TabsList className="flex-col w-full gap-2 bg-background">
              {visibleTabs.map((tab) => (
                <TabsTrigger
                  className="w-full"
                  key={tab.id}
                  value={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  size="lg"
                >
                  <tab.icon className="size-5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

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

            <Button variant="destructive" className="w-full" onClick={handleSignOut} icon={LogOutIcon}>
              <Trans>Sign out</Trans>
            </Button>
          </div>
        </nav>

        <div className="flex-1 min-w-0">
          {activeTab === "general" && <SettingsGeneralTab />}
          {activeTab === "activity" && <SettingsActivityTab />}
          {activeTab === "indexers" && isAdmin && <SettingsIndexersTab />}
          {activeTab === "storage" && isAdmin && <SettingsStorageTab />}
          {activeTab === "users" && isAdmin && <SettingsUsersTab />}
        </div>

        <div className="md:hidden space-y-3">
          <Card className="py-4 gap-0">
            <CardContent className="flex items-center gap-2">
              <img src="/logo.svg" alt="Seedarr" className="size-8 shrink-0" />
              <div>
                <p className="font-semibold">seedarr</p>
                <AppVersionBadge />
              </div>
            </CardContent>
          </Card>

          <Button variant="destructive" className="w-full" onClick={handleSignOut} icon={LogOutIcon}>
            <Trans>Sign out</Trans>
          </Button>
        </div>
      </div>
    </Container>
  );
}
