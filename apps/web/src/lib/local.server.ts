import { createServerFn } from "@tanstack/react-start";
import type { AvailableLanguage } from "tmdb-ts";

/**
 * Detect user's locale from cookie or Accept-Language header (SSR-compatible)
 */
export const detectLocale = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();

  // Read from cookie
  const cookie = request.headers.get("cookie") || "";
  const cookieMatch = cookie.match(/locale=([^;]+)/);
  const cookieLocale = cookieMatch?.[1];

  // Read from Accept-Language header
  const acceptLanguage = request.headers.get("accept-language")?.split(",")[0]?.split("-")[0];

  // Priority: Cookie → Accept-Language → Fallback
  return cookieLocale || acceptLanguage || "en";
});

/**
 * Map language code to TMDB locale format
 */
const TMDB_LOCALE_MAP: Record<string, AvailableLanguage> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT",
  ja: "ja-JP",
  ko: "ko-KR",
  zh: "zh-CN",
};

/**
 * Get TMDB-compatible language
 */
export const getTMDBLanguage = createServerFn({ method: "GET" }).handler(
  async (): Promise<AvailableLanguage | undefined> => {
    const locale = await detectLocale();
    const lang = locale.split("-")[0]; // "fr-FR" -> "fr"
    return TMDB_LOCALE_MAP[lang];
  },
);
