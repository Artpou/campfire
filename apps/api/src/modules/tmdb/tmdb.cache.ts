import ms from "ms";

import { logger } from "@/shared/helpers/logger.helper";

import type { FetchOptions } from "./tmdb.types";

const CACHE_TTL = ms("1h");
const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function getTmdbCache(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return;
  }

  return entry.value;
}

export function setTmdbCache(key: string, url: string, options: FetchOptions | undefined, value: unknown): void {
  if (!isCacheableTmdbRequest(url, options)) return;
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL, value });
  logger.debug("TMDB (cached)", `SET ${key}`);
}

function isCacheableTmdbRequest(url: string, options?: FetchOptions): boolean {
  if (url === "/genre/movie/list" || url === "/genre/tv/list") return true;
  if (!options) return false;

  const definedCount = Object.values(options).filter((v) => v !== undefined).length;

  const isFirstPage = String(options.page) === "1";

  if (url === "/discover/movie") {
    const isTrending =
      definedCount === 3 &&
      options["release_date.lte"] !== undefined &&
      options.sort_by === "popularity.desc" &&
      options.with_release_type === "4|5";

    const isBase =
      definedCount === 3 && isFirstPage && options.locale !== undefined && options.with_release_type === "4|5";

    return isTrending || isBase;
  }

  if (url === "/discover/tv") {
    return definedCount === 2 && isFirstPage && options.locale !== undefined;
  }

  return false;
}

export const isCachedPayload = <T>(value: unknown): value is T => value !== undefined && value !== null;
