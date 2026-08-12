import { createCache } from "@/shared/helpers/cache.helper";

import { db } from "@/db/db";

interface CachedKey {
  value: string | null;
}

const cache = createCache<CachedKey>({
  max: 2,
  ttl: 60_000,
  name: "tmdb-key",
});

/** Settings DB key only — used by remote sync (no .env fallback). */
export async function getSettingsTmdbApiKey(): Promise<string | null> {
  const cached = cache.get("settings");
  if (cached) return cached.value;

  const row = await db.query.settings.findFirst();
  const key = row?.tmdbApiKey || null;
  cache.set("settings", { value: key });
  return key;
}

/** Settings DB key first, then .env — used by browse/search and other TMDB features. */
export async function getTmdbApiKey(): Promise<string | null> {
  const cached = cache.get("full");
  if (cached) return cached.value;

  const row = await db.query.settings.findFirst();
  const key = row?.tmdbApiKey || process.env.TMDB_API_KEY || null;
  cache.set("full", { value: key });
  return key;
}

export function invalidateTmdbKeyCache(): void {
  cache.clear();
}
