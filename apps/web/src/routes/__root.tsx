import { lazy } from "react";

import { createRootRouteWithContext, Navigate, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { RouteErrorHandler } from "@/shared/components/route-error";
import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { useThemeStore, useThemeSync } from "@/shared/hooks/use-theme";

import type { SeedarrRouterContext } from "@/router";

const TanStackDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }, { ReactQueryDevtoolsPanel }] = await Promise.all([
        import("@tanstack/react-devtools"),
        import("@tanstack/react-router-devtools"),
        import("@tanstack/react-query-devtools"),
      ]);

      return {
        default: () => (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
              { name: "React Query", render: <ReactQueryDevtoolsPanel /> },
            ]}
          />
        ),
      };
    })
  : () => null;

export const Route = createRootRouteWithContext<SeedarrRouterContext>()({
  errorComponent: RouteErrorHandler,
  notFoundComponent: () => <Navigate to="/404" replace />,
  pendingComponent: () => <SeedarrLoaderContainer />,
  component: RootComponent,
});

function RootComponent() {
  useThemeSync();
  const theme = useThemeStore((state) => state.theme);

  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <Toaster richColors position="bottom-right" theme={theme} />
      <TanStackDevtools />
    </>
  );
}
