import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRootRoute, Navigate, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import ms from "ms";
import { Toaster } from "sonner";

import { getI18nInstance, getInitialCountry, getLanguageFromCountry } from "@/shared/helpers/i18n.helper";
import { LinguiClientProvider } from "@/shared/lingui-client-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const Route = createRootRoute({
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ms("5m"),
      gcTime: ms("30m"),
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "campfire-query-cache",
});

function RootComponent() {
  const initialCountry = getInitialCountry();
  const uiLanguage = getLanguageFromCountry(initialCountry);

  const i18n = getI18nInstance(uiLanguage);

  return (
    <LinguiClientProvider initialLocale={initialCountry} initialMessages={i18n.messages}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: ms("24h"),
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const key = query.queryKey[0];
              return key === "genres" || key === "providers";
            },
          },
        }}
      >
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
      </PersistQueryClientProvider>
    </LinguiClientProvider>
  );
}
