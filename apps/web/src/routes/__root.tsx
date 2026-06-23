import { lazy } from "react";

import { createRootRouteWithContext, Navigate, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { RouteErrorHandler } from "@/shared/components/route-error";

import { SeedarrRouterContext } from "@/router";

const TanStackDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const { TanStackDevtools } = await import("@tanstack/react-devtools");
      const { TanStackRouterDevtoolsPanel } = await import("@tanstack/react-router-devtools");
      return {
        default: () => (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
          />
        ),
      };
    })
  : () => null;

export const Route = createRootRouteWithContext<SeedarrRouterContext>()({
  errorComponent: RouteErrorHandler,
  notFoundComponent: () => <Navigate to="/404" replace />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
      <Toaster richColors position="bottom-right" />
      <TanStackDevtools />
    </>
  );
}
