import { useLingui } from "@lingui/react";
import { useMemo, useState } from "react";
import type { WatchLocale } from "tmdb-ts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/hooks/use-locale";

// Language to country mapping (one country per language)
const LANGUAGE_TO_COUNTRY = {
  cs: "CZ",
  da: "DK",
  de: "DE",
  et: "EE",
  es: "ES",
  fi: "FI",
  fr: "FR",
  el: "GR",
  hu: "HU",
  id: "ID",
  hi: "IN",
  it: "IT",
  ja: "JP",
  ko: "KR",
  lt: "LT",
  lv: "LV",
  ms: "MY",
  nl: "NL",
  no: "NO",
  pl: "PL",
  pt: "PT",
  ro: "RO",
  ru: "RU",
  sv: "SE",
  th: "TH",
  tr: "TR",
  en: "US",
} as const;

const TMDB_COUNTRIES = Object.values(LANGUAGE_TO_COUNTRY);
const UI_LOCALES = ["en", "fr"] as const;

export function LanguageSelector() {
  const { locale: initialLocale } = useLocale();
  const [currentCountry, setCurrentCountry] = useState(initialLocale);

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
    const selectedCountry = country as keyof WatchLocale;
    setCurrentCountry(selectedCountry);

    // Get language from country using Intl
    const intlLocale = new Intl.Locale(`und-${selectedCountry}`).maximize();
    const language = intlLocale.language;
    const fullLocale = `${language}-${selectedCountry}`;

    localStorage.setItem("locale", fullLocale);
    document.cookie = `locale=${language}; path=/; max-age=31536000; SameSite=Lax`;

    // Reload page to apply new locale
    window.location.reload();
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
