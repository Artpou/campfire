import { formatError } from "@seedarr/shared";
import ms from "ms";

import { logger } from "@/shared/helpers/logger.helper";

const CACHE_TTL = ms("1h");

const ALWAYS_CACHED_ROUTES = ["/genre/movie/list", "/watch/providers/movie", "/genre/tv/list", "/watch/providers/tv"];

const DISCOVER_CHECK_PARAMS = [
  "api_key",
  "language",
  "page",
  "limit",
  "locale",
  "with_release_type",
  "release_date.lte",
];

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function getTmdbCache<T>(url: string): T | undefined {
  if (!isCacheableTmdbRequest(url)) return;

  const entry = cache.get(url);
  if (!entry) return;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(url);
    logger.debug("TMDB", `cache expired for ${url}`);
    return;
  }

  return entry.value as T;
}

export function setTmdbCache(key: string, value: unknown): void {
  try {
    if (!isCacheableTmdbRequest(key)) return;
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL, value });
    logger.debug("TMDB", `cache set for ${key}`);
  } catch (e: unknown) {
    logger.error("TMDB", `cache error : ${formatError(e)}`);
  }
}

function isCacheableTmdbRequest(key: string): boolean {
  try {
    const url = new URL(key);
    const pathname = url.pathname;
    const params = url.searchParams;

    if (ALWAYS_CACHED_ROUTES.some((route) => pathname.endsWith(route))) {
      return true;
    }

    if (pathname.endsWith("/discover/movie") || pathname.endsWith("/discover/tv")) {
      const page = params.get("page");
      const isPageOne = !page || page === "1";

      if (!isPageOne) return false;

      for (const paramKey of params.keys()) {
        if (!DISCOVER_CHECK_PARAMS.includes(paramKey)) {
          return false;
        }
      }

      return true;
    }

    return false;
  } catch {
    return false;
  }
}
