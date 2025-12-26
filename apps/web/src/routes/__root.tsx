import { setI18n } from "@lingui/react/server";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import ms from "ms";
import { useState } from "react";
import { LinguiClientProvider } from "@/components/lingui-client-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getI18nInstance } from "@/i18n";
import { detectLocale } from "@/lib/local.server";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: async () => {
    return { locale: await detectLocale() };
  },
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
        title: "Basement",
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
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-destructive">
            Something went wrong!
          </CardTitle>
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

  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-destructive">404</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground text-lg mb-6">The page you're looking for doesn't exist.</p>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold  transition-colors"
          >
            Go Back
          </button>
        </CardContent>
      </Card>
    </div>
  ),

  shellComponent: RootDocument,
});

function ProtectedContent() {
  // Authentication is now handled by layout routes
  // _app routes are protected by _app.tsx layout
  // _auth routes are public
  return <Outlet />;
}

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

  // Get locale from loader (reads from cookie in SSR)
  const { locale } = Route.useLoaderData();

  // Create i18n instance with user's preferred locale
  const i18n = getI18nInstance(locale);

  // Make i18n available for server-side rendering
  setI18n(i18n);

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body className="dark h-screen overflow-hidden">
        {/* Modern gradient background */}
        <div className="fixed inset-0 -z-10 bg-linear-to-br from-primary/12 via-background to-accent/5" />

        <LinguiClientProvider initialLocale={locale} initialMessages={i18n.messages}>
          <QueryClientProvider client={queryClient}>
            <div className="h-screen flex flex-col">
              <ProtectedContent />
            </div>
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
        </LinguiClientProvider>
      </body>
    </html>
  );
}
