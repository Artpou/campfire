import { StrictMode } from "react";

import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { ErrorBoundary } from "./shared/components/error-boundary";
import "./styles.css";

import { useLingui } from "@lingui/react";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import ms from "ms";

import { getI18nInstance, getInitialCountry, getLanguageFromCountry } from "@/shared/helpers/i18n.helper";
import { LinguiClientProvider } from "@/shared/lingui-client-provider";

import { queryClient, router } from "@/router";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "campfire-query-cache",
});

function InnerApp() {
  const { i18n: linguiInstance } = useLingui();

  return <RouterProvider router={router} context={{ queryClient, language: linguiInstance.locale }} />;
}

function App() {
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
        <ErrorBoundary>
          <InnerApp />
        </ErrorBoundary>
      </PersistQueryClientProvider>
    </LinguiClientProvider>
  );
}

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
