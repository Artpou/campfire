import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRouteWithContext, Navigate, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";

import { RouteErrorHandler } from "@/shared/components/route-error";

import { SeedarrRouterContext } from "@/router";

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
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
