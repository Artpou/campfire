import { useLingui } from "@lingui/react";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";

export function useTmdbLocale(): string {
  const { i18n } = useLingui();
  return countryToTmdbLocale(i18n.locale);
}
