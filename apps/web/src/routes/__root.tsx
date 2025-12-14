import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import ms from "ms";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: import.meta.env.VITE_SITE_NAME || "Basement",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600;700&display=swap",
      },
    ],
  }),

  errorComponent: ({ error }) => (
    <div class="min-h-screen flex items-center justify-center px-6">
      <Card class="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle class="text-4xl font-bold text-destructive">Something went wrong!</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="bg-destructive/10 border border-destructive  p-4 mb-6">
            <p class="text-destructive font-mono text-sm break-all">{error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            class="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold  transition-colors"
          >
            Reload Page
          </button>
        </CardContent>
      </Card>
    </div>
  ),

  notFoundComponent: () => (
    <div class="min-h-screen flex items-center justify-center px-6">
      <Card class="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle class="text-4xl font-bold text-destructive">404</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-foreground text-lg mb-6">The page you're looking for doesn't exist.</p>
          <button
            type="button"
            onClick={() => window.history.back()}
            class="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold  transition-colors"
          >
            Go Back
          </button>
        </CardContent>
      </Card>
    </div>
  ),

  shellComponent: RootDocument,
});

function RootDocument() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: ms("5s"),
            retry: false,
          },
        },
      }),
  );

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body class="dark">
        <QueryClientProvider client={queryClient}>
          <Outlet />
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
          <Scripts />
        </QueryClientProvider>
      </body>
    </html>
  );
}
