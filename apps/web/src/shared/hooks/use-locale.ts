import { useMemo } from "react";

import { useLingui } from "@lingui/react";

import { LANGUAGE_TO_FULL_LOCALE } from "@/shared/helpers/i18n.helper";

export function useLocale() {
  const { i18n } = useLingui();
  const language = i18n.locale as keyof typeof LANGUAGE_TO_FULL_LOCALE;

  const localeFull = useMemo(() => {
    if (typeof window === "undefined") {
      return LANGUAGE_TO_FULL_LOCALE[language];
    }

    const stored = localStorage.getItem("locale");
    if (stored?.startsWith(language)) {
      return stored;
    }

    return LANGUAGE_TO_FULL_LOCALE[language];
  }, [language]);

  const locale = useMemo(() => localeFull.split("-")[1], [localeFull]);

  return { language, localeFull, locale };
}
