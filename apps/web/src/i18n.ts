import { i18n, type Messages } from "@lingui/core";

import { getI18nMessages, getInitialCountry, getLanguageFromCountry } from "@/shared/helpers/i18n.helper";

export { i18n };

export function activateI18n(locale: string, messages: Messages): void {
  i18n.loadAndActivate({ locale, messages });
}

if (typeof window !== "undefined") {
  const country = getInitialCountry();
  const language = getLanguageFromCountry(country);
  activateI18n(country, getI18nMessages(language));
}
