import { useMemo } from "react";

import { useLingui } from "@lingui/react";

import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

// @ts-expect-error - Compiled message files don't have type definitions
import { messages as enMessages } from "@/locales/en/messages.mjs";
// @ts-expect-error - Compiled message files don't have type definitions
import { messages as frMessages } from "@/locales/fr/messages.mjs";

const TMDB_COUNTRIES = [
  "CZ",
  "DK",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HU",
  "ID",
  "IN",
  "IT",
  "JP",
  "KR",
  "LT",
  "LV",
  "MY",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RU",
  "SE",
  "TH",
  "TR",
  "US",
] as const;

const UI_LOCALES = ["en", "fr"] as const;

const MESSAGES_MAP = {
  en: enMessages,
  fr: frMessages,
};

export function LanguageSelector() {
  const { i18n } = useLingui();
  const currentCountry = i18n.locale;

  const locales = useMemo(() => {
    const all = TMDB_COUNTRIES.map((country) => {
      const intlLocale = new Intl.Locale(`und-${country}`).maximize();
      const language = intlLocale.language;
      const fullLocale = `${language}-${country}`;

      let displayName = country;
      try {
        const dn = new Intl.DisplayNames([fullLocale], { type: "language" });
        const name = dn.of(language) || country;
        // Capitalize first letter
        displayName = name.charAt(0).toUpperCase() + name.slice(1);
      } catch {}

      return {
        country,
        language,
        displayName,
        isUiSupported: UI_LOCALES.includes(language as (typeof UI_LOCALES)[number]),
      };
    });

    // Sort: 1) Selected, 2) UI supported, 3) Others alphabetically
    return all.sort((a, b) => {
      const aIsSelected = a.country === currentCountry;
      const bIsSelected = b.country === currentCountry;

      if (aIsSelected && !bIsSelected) return -1;
      if (!aIsSelected && bIsSelected) return 1;

      if (a.isUiSupported && !b.isUiSupported) return -1;
      if (!a.isUiSupported && b.isUiSupported) return 1;

      return a.displayName.localeCompare(b.displayName);
    });
  }, [currentCountry]);

  const handleChange = (country: string) => {
    // Get language from country
    const intlLocale = new Intl.Locale(`und-${country}`).maximize();
    const language = intlLocale.language;

    // Update Lingui locale to the country code (this becomes our source of truth)
    // Load UI messages if language is supported, otherwise keep current
    if (UI_LOCALES.includes(language as (typeof UI_LOCALES)[number])) {
      const messages = MESSAGES_MAP[language as keyof typeof MESSAGES_MAP];
      i18n.load(language, messages);
      i18n.activate(country); // Use country as locale ID
    } else {
      // Just change the locale ID, keeping current UI messages
      i18n.activate(country);
    }
  };

  return (
    <Select value={currentCountry} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-fit gap-2 px-2">
        <SelectValue>
          <img
            src={`https://flagsapi.com/${currentCountry}/flat/64.png`}
            alt={currentCountry}
            className="size-5 rounded-sm object-cover"
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map(({ country, displayName, isUiSupported }) => (
          <SelectItem key={country} value={country}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              {isUiSupported && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  UI
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
