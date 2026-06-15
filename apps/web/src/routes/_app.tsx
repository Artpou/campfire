import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AlertTriangleIcon, FilmIcon, LibraryIcon, ListIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppTopbar } from "@/shared/app-topbar";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";

const navItems = [
  {
    title: msg`Movies`,
    url: "/movies",
    icon: FilmIcon,
  },
  {
    title: msg`TV Shows`,
    url: "/tv",
    icon: TvIcon,
  },
  {
    title: msg`Library`,
    url: "/downloads",
    icon: LibraryIcon,
    minRole: "member" as const,
  },
  {
    title: msg`Lists`,
    url: "/lists",
    icon: ListIcon,
    matchPrefix: "/lists",
  },
];

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    try {
      const data = await unwrap(api.auth.me.$get());
      useAuth.getState().setUser(data);
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const { t } = useLingui();
  const { isAdmin, hasRole } = useRole();
  const user = useAuth((state) => state.user);

  const indexerManagers = user?.indexerManagers;
  const isIndexerMisconfigured = isAdmin && (!indexerManagers || indexerManagers.length === 0);

  const visibleNavItems = navItems.filter((item) => {
    if (item.minRole && !hasRole(item.minRole)) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-w-0">
      {isIndexerMisconfigured && (
        <Link
          to="/settings"
          className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center gap-2 text-warning hover:bg-warning/20 transition-colors"
        >
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span className="text-sm">
            <Trans>Torrent indexer is not configured. Click here to set up your indexer (Prowlarr or Jackett).</Trans>
          </span>
        </Link>
      )}
      <AppTopbar isAuthenticated={true} />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex items-center justify-around h-16">
          {visibleNavItems.map((item) => {
            const matchUrl = item.matchPrefix ?? item.url;
            const isActive = location.pathname.startsWith(matchUrl);
            return (
              <Link
                key={item.url}
                to={item.url}
                search={{}}
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
  );
}
