import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { ActivityIcon, PuzzleIcon, SettingsIcon, UsersIcon } from "lucide-react";

import { AppVersionCard } from "@/shared/components/app-version-card";
import { DropSelect } from "@/shared/components/drop-select";
import { Container } from "@/shared/ui/container";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useRole } from "@/features/auth/hooks/use-role";

type SettingsTab = "general" | "activity" | "modules" | "users";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { isAdmin, hasRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "general" as const, label: <Trans>General</Trans>, icon: SettingsIcon, adminOnly: false, memberOnly: false },
    { id: "modules" as const, label: <Trans>Modules</Trans>, icon: PuzzleIcon, adminOnly: true, memberOnly: false },
    { id: "activity" as const, label: <Trans>Activity</Trans>, icon: ActivityIcon, adminOnly: false, memberOnly: true },
    { id: "users" as const, label: <Trans>Users</Trans>, icon: UsersIcon, adminOnly: true, memberOnly: false },
  ];

  const visibleTabs = tabs.filter((tab) => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.memberOnly && !hasRole("member")) return false;
    return true;
  });

  const activeTab = (location.pathname.split("/").pop() ?? "general") as SettingsTab;
  const isModuleDetail = location.pathname.includes("/settings/modules/");

  return (
    <Container className="pb-3 sm:pb-6">
      <div className="flex flex-col md:flex-row md:gap-6 md:gap-8">
        {!isModuleDetail && (
          <aside className="md:w-56 shrink-0 md:sticky md:top-6 md:self-start space-y-4">
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

            <Tabs className="hidden md:block" value={activeTab}>
              <TabsList className="flex-col w-full gap-1 bg-transparent p-0 h-auto">
                {visibleTabs.map((tab) => (
                  <TabsTrigger className="w-full justify-start" key={tab.id} value={tab.id} size="lg" asChild>
                    <Link to={`/settings/${tab.id}` as `/settings/${SettingsTab}`}>
                      <tab.icon className="size-4" />
                      {tab.label}
                    </Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <AppVersionCard />
          </aside>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </Container>
  );
}
