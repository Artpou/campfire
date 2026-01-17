import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AlertTriangle, Film, Settings, Tv } from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/shared/app-sidebar";
import { AppTopbar } from "@/shared/app-topbar";
import { SidebarProvider } from "@/shared/ui/sidebar";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";

const navItems = [
  {
    title: msg`Movies`,
    url: "/movies",
    icon: Film,
  },
  {
    title: msg`TV Shows`,
    url: "/tv",
    icon: Tv,
  },
  {
    title: msg`Settings`,
    url: "/settings",
    icon: Settings,
  },
];

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    try {
      const response = await api.auth.me.$get();
      if (response.ok) {
        const data = await response.json();
        useAuth.getState().setUser(data);
      } else {
        throw redirect({ to: "/login" });
      }
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const { t } = useLingui();
  const { isAdmin } = useRole();
  const user = useAuth((state) => state.user);

  const selectedIndexer = user?.selectedIndexer;
  const isIndexerMisconfigured =
    isAdmin && (!selectedIndexer || !selectedIndexer.apiKey || !selectedIndexer.baseUrl);

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {isIndexerMisconfigured && (
          <Link
            to="/settings"
            search={{ tab: "indexer" }}
            className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center gap-2 text-warning hover:bg-warning/20 transition-colors"
          >
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-sm">
              <Trans>
                Torrent indexer is not configured. Click here to set up your indexer (Prowlarr or
                Jackett).
              </Trans>
            </span>
          </Link>
        )}
        <AppTopbar isAuthenticated={true} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.url);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  <span className="text-xs font-medium">{t(item.title)}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}
