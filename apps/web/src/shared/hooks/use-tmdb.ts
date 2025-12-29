import { useMemo } from "react";

import { useLingui } from "@lingui/react";

import { tmdbClient } from "@/lib/tmdb-client";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";

export function useTMDB() {
  const { i18n } = useLingui();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  const tmdb = useMemo(() => tmdbClient({ language: tmdbLocale }), [tmdbLocale]);

  return { tmdb, tmdbLocale };
}
