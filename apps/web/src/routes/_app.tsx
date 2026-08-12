import { useEffect, useRef } from "react";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import { Trans as TransMacro, useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { createFileRoute, isRedirect, Link, Outlet, redirect, useLocation, useRouter } from "@tanstack/react-router";
import { AlertTriangleIcon, FilmIcon, LibraryIcon, TvIcon, UserIcon } from "lucide-react";
import ms from "ms";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { AppTopbar } from "@/shared/components/app-topbar";
import { ErrorView } from "@/shared/components/error/error-view";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location, context }) => {
    try {
      const user = await context.queryClient.ensureQueryData({
        queryKey: ["auth", "me"],
        queryFn: () => unwrap(api.auth.me.$get()),
        staleTime: ms("5m"),
      });
      useAuth.getState().setUser(user);

      const isAdmin = user.role === "admin" || user.role === "owner";
      const noIndexers = user.countIndexerManagers === 0;
      const alreadyOnboarded = useAuth.getState().ownerOnboardingCompleted;

      if (isAdmin && noIndexers && !alreadyOnboarded && !location.pathname.startsWith("/onboarding")) {
        throw redirect({ to: "/onboarding" });
      }

      return { user };
    } catch (err) {
      if (isRedirect(err)) throw err;

      const isNetworkError =
        err &&
        typeof err === "object" &&
        "status" in err &&
        ((err as { status: number }).status === 0 || (err as { status: number }).status >= 502);
      if (isNetworkError) {
        throw err;
      }

      useAuth.getState().setUser(null);
      throw redirect({ to: "/login" });
    }
  },
  errorComponent: ErrorView,
  component: AuthenticatedLayout,
});

interface MobileNavItem {
  title: ReturnType<typeof msg>;
  url: string;
  icon: typeof FilmIcon;
  minRole?: "member" | "admin" | "owner";
  matchPrefix?: string;
}

const MOBILE_NAV_STATIC: MobileNavItem[] = [
  { title: msg({ id: "nav.movies", message: "Movies" }), url: "/movies", icon: FilmIcon },
  { title: msg({ id: "nav.tv-shows", message: "TV Shows" }), url: "/tv", icon: TvIcon },
  { title: msg({ id: "nav.library", message: "Library" }), url: "/downloads", icon: LibraryIcon },
];

function AuthenticatedLayout() {
  const user = useAuth((s) => s.user);
  const { isAdmin, hasRole } = useRole();
  const { state, href } = useLocation();
  const { t } = useLingui();
  const router = useRouter();

  const stateRef = useRef<unknown>(null);

  useEffect(() => {
    if (state?.unauthorized && stateRef.current !== state) {
      stateRef.current = state;

      setTimeout(() => {
        router.history.replace(href, { ...state, unauthorized: undefined });
        toast.error(t`Forbidden`, { description: t`You are not authorized to access this page.` });
        // need to wait for the toast to be displayed
      }, 100);
    }
  }, [state, href, router.history, t]);

  const isIndexerMisconfigured = isAdmin && user?.countIndexerManagers === 0;

  const mobileNav: MobileNavItem[] = [
    ...MOBILE_NAV_STATIC,
    {
      title: msg({ id: "nav.profile", message: "Profile" }),
      url: user ? `/user/${user.id}` : "/user",
      icon: UserIcon,
      matchPrefix: "/user",
    },
  ];

  const visibleNavItems = mobileNav.filter((item) => {
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
            <TransMacro>Torrent indexer is not configured. Click here to set up your indexer.</TransMacro>
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
                <span className="text-xs font-medium">
                  <Trans id={item.title.id} />
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
