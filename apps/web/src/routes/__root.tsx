import { useState } from "react";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import ms from "ms";

import { getI18nInstance } from "@/shared/helpers/i18n.helper";
import { LinguiClientProvider } from "@/shared/lingui-client-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const Route = createRootRoute({
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

  component: RootComponent,
});

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: ms("5m"),
            gcTime: ms("30m"),
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Get initial country code from browser locale (e.g., "en-US" -> "US")
  const getInitialCountry = () => {
    if (typeof window === "undefined") return "US";
    const browserLocale = navigator.language || "en-US";
    const countryCode = browserLocale.split("-")[1] || "US";
    return countryCode;
  };

  const initialCountry = getInitialCountry();

  // Get the language for UI translations (e.g., "US" -> "en", "FR" -> "fr")
  const getLanguageFromCountry = (country: string): string => {
    const intlLocale = new Intl.Locale(`und-${country}`).maximize();
    const language = intlLocale.language;
    // Default to English if language not supported
    return ["en", "fr"].includes(language) ? language : "en";
  };

  const uiLanguage = getLanguageFromCountry(initialCountry);

  // Create i18n instance with UI language for messages, but use country as locale ID
  const i18n = getI18nInstance(uiLanguage);

  return (
    <LinguiClientProvider initialLocale={initialCountry} initialMessages={i18n.messages}>
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
      </QueryClientProvider>
    </LinguiClientProvider>
  );
}
