import { StrictMode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { ErrorBoundary } from "./shared/components/error-boundary";
import "./styles.css";

import { useLingui } from "@lingui/react";

import { LinguiClientProvider } from "@/shared/components/lingui-client-provider";
import { getI18nMessages, getInitialCountry, getLanguageFromCountry } from "@/shared/helpers/i18n.helper";

import { queryClient, router } from "@/router";

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const { i18n: linguiInstance } = useLingui();

  return <RouterProvider router={router} context={{ queryClient, language: linguiInstance.locale }} />;
}

function App() {
  const initialCountry = getInitialCountry();
  const uiLanguage = getLanguageFromCountry(initialCountry);
  const messages = getI18nMessages(uiLanguage);

  return (
    <LinguiClientProvider initialLocale={initialCountry} initialMessages={messages}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <InnerApp />
        </ErrorBoundary>
      </QueryClientProvider>
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
