import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRouteWithContext, Navigate, Outlet, ScrollRestoration } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { SeedarrRouterContext } from "@/router";

export const Route = createRootRouteWithContext<SeedarrRouterContext>()({
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-destructive">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-destructive/10 border border-destructive  p-4 mb-6">
            <p className="text-destructive font-mono text-sm break-all">{error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold  transition-colors"
          >
            Reload Page
          </button>
        </CardContent>
      </Card>
    </div>
  ),
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
