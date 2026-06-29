import { useState } from "react";

import type { Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";

import { activateI18n, i18n } from "@/i18n";

export function LinguiClientProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: React.ReactNode;
  initialLocale: string;
  initialMessages: Messages;
}) {
  useState(() => {
    activateI18n(initialLocale, initialMessages);
    return true;
  });

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
