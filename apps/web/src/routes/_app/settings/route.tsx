import { Trans } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, HardDriveIcon, LogOutIcon, RssIcon, ServerIcon, SettingsIcon, UsersIcon } from "lucide-react";

import { DropSelect } from "@/shared/components/drop-select";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { AppVersionBadge } from "@/features/settings/components/app-version-badge";

type SettingsTab = "general" | "activity" | "indexers" | "storage" | "users";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { isAdmin, hasRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const logout = useAuth((s) => s.logout);

  const tabs = [
    { id: "general" as const, label: <Trans>General</Trans>, icon: SettingsIcon, adminOnly: false, memberOnly: false },
    { id: "indexers" as const, label: <Trans>Indexers</Trans>, icon: RssIcon, adminOnly: true, memberOnly: false },
    { id: "storage" as const, label: <Trans>Storage</Trans>, icon: ServerIcon, adminOnly: true, memberOnly: false },
    { id: "activity" as const, label: <Trans>Activity</Trans>, icon: ActivityIcon, adminOnly: false, memberOnly: true },
    { id: "users" as const, label: <Trans>Users</Trans>, icon: UsersIcon, adminOnly: true, memberOnly: false },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.memberOnly && !hasRole("member")) return false;
    return true;
  });

  const activeTab = (location.pathname.split("/").pop() ?? "general") as SettingsTab;

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
            <DropSelect
              value={activeTab}
              onValueChange={(value) => navigate({ to: `/settings/${value}` as `/settings/${SettingsTab}` })}
              triggerClassName="w-full h-11"
              label={<Trans>Settings</Trans>}
              options={visibleTabs.map((tab) => ({
                value: tab.id,
                label: (
                  <span className="flex items-center gap-2">
                    <tab.icon className="size-4" />
                    {tab.label}
                  </span>
                ),
              }))}
            />
          </div>

          <Tabs className="hidden md:flex md:flex-col flex-1" value={activeTab}>
            <TabsList className="flex-col w-full gap-2 bg-background">
              {visibleTabs.map((tab) => (
                <TabsTrigger className="w-full" key={tab.id} value={tab.id} size="lg" asChild>
                  <Link to={`/settings/${tab.id}` as `/settings/${SettingsTab}`}>
                    <tab.icon className="size-5" />
                    {tab.label}
                  </Link>
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
          <Outlet />
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
