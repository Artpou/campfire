import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Navigate, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AlertTriangleIcon, FilmIcon, LibraryIcon, ListIcon, TvIcon } from "lucide-react";
import ms from "ms";

import { cn } from "@/lib/utils";
import { AppTopbar } from "@/shared/app-topbar";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { indexerManagerQueries } from "@/features/torrent/hooks/indexer.queries";

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

const authQueryOptions = {
  queryKey: ["auth", "me"],
  queryFn: () => unwrap(api.auth.me.$get()),
  staleTime: ms("5m"),
};

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location, context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(authQueryOptions);
      useAuth.getState().setUser(user);

      const isAdmin = user.role === "admin" || user.role === "owner";
      const noIndexers = user.countIndexerManagers === 0;

      if (isAdmin && noIndexers && !location.pathname.startsWith("/onboarding")) {
        throw redirect({ to: "/onboarding" });
      }

      return { user };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;

      useAuth.getState().setUser(null);
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context }) => {
    return context.queryClient.ensureQueryData(indexerManagerQueries.count());
  },
  errorComponent: () => <Navigate to="/404" replace />,
  pendingComponent: () => <SeedarrLoaderContainer />,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const location = useLocation();
  const { t } = useLingui();
  const { isAdmin, hasRole } = useRole();
  const { data: count = 0 } = useSuspenseQuery(indexerManagerQueries.count());

  const isIndexerMisconfigured = isAdmin && count === 0;

  const visibleNavItems = navItems.filter((item) => {
    if (item.minRole && !hasRole(item.minRole)) return false;
    return true;
  });

  return (
    <div className="flex flex-col min-w-0">
      {isIndexerMisconfigured && (
        <Link
          to="/onboarding"
          className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center gap-2 text-warning hover:bg-warning/20 transition-colors"
        >
          <AlertTriangleIcon className="size-4 shrink-0" />
          <span className="text-sm">
            <Trans>Torrent indexer is not configured. Click here to set up your indexer.</Trans>
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
