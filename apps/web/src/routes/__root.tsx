import { lazy } from "react";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { ErrorView, NotFoundView } from "@/shared/components/error/error-view";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { useThemeStore, useThemeSync } from "@/shared/hooks/use-theme";
import { Container } from "@/shared/ui/container";

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
  errorComponent: ErrorView,
  notFoundComponent: NotFoundView,
  pendingComponent: () => (
    <Container full>
      <SeedarrLoader />
    </Container>
  ),
  component: RootComponent,
});

function RootComponent() {
  useThemeSync();
  const theme = useThemeStore((state) => state.theme);

  return (
    <>
      <Outlet />
      <Toaster richColors position="bottom-right" theme={theme} />
      <TanStackDevtools />
    </>
  );
}
