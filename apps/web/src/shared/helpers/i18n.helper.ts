import { type Messages, setupI18n } from "@lingui/core";
import type { AvailableLanguage } from "tmdb-ts";

// @ts-expect-error - Compiled message files don't have type definitions
import { messages as enMessages } from "../../locales/en/messages.mjs";
// @ts-expect-error - Compiled message files don't have type definitions
import { messages as frMessages } from "../../locales/fr/messages.mjs";

const LOCALE_STORAGE_KEY = "locale";

export const UI_LOCALES = ["en", "fr"] as const;

function getStoredCountry(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LOCALE_STORAGE_KEY);
}

export function setStoredCountry(country: string): void {
  localStorage.setItem(LOCALE_STORAGE_KEY, country);
}

export function getLanguageFromCountry(country: string): string {
  const intlLocale = new Intl.Locale(`und-${country}`).maximize();
  const language = intlLocale.language;
  return UI_LOCALES.includes(language as (typeof UI_LOCALES)[number]) ? language : "en";
}

export function getInitialCountry(): string {
  if (typeof window === "undefined") return "US";

  const stored = getStoredCountry();
  if (stored) return stored;

  const browserLocale = navigator.language || "en-US";
  return browserLocale.split("-")[1] || "US";
}

const allMessages: Record<string, Messages> = {
  en: enMessages,
  fr: frMessages,
};

/**
 * Create a new i18n instance for the given locale.
 * Used for SSR and client-side rendering.
 */
export function getI18nInstance(locale: string) {
  return setupI18n({
    locale,
    messages: { [locale]: allMessages[locale] || allMessages.en },
  });
}

/**
 * Convert a country code to TMDB locale format.
 * Maps country codes to their language-country locale (e.g., "FR" -> "fr-FR")
 * Returns a type-safe TMDB AvailableLanguage
 */
export function countryToTmdbLocale(country: string): AvailableLanguage {
  const languageMap: Record<string, AvailableLanguage> = {
    CZ: "cs-CZ",
    DK: "da-DK",
    DE: "de-DE",
    EE: "et-EE",
    ES: "es-ES",
    FI: "fi-FI",
    FR: "fr-FR",
    GR: "el-GR",
    HU: "hu-HU",
    ID: "id-ID",
    IN: "hi-IN",
    IT: "it-IT",
    JP: "ja-JP",
    KR: "ko-KR",
    LT: "lt-LT",
    LV: "lv-LV",
    MY: "ms-MY",
    NL: "nl-NL",
    NO: "no-NO",
    PL: "pl-PL",
    PT: "pt-PT",
    RO: "ro-RO",
    RU: "ru-RU",
    SE: "sv-SE",
    TH: "th-TH",
    TR: "tr-TR",
    US: "en-US",
  };

  return languageMap[country] || "en-US";
}
