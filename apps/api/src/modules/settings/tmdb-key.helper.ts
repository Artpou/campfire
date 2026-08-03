import { db } from "@/db/db";

const CACHE_TTL_MS = 60_000;

let cachedKey: { value: string | null; expiresAt: number } | null = null;
let cachedSettingsKey: { value: string | null; expiresAt: number } | null = null;

/** Settings DB key only — used by remote sync (no .env fallback). */
export async function getSettingsTmdbApiKey(): Promise<string | null> {
  if (cachedSettingsKey && Date.now() < cachedSettingsKey.expiresAt) return cachedSettingsKey.value;
  const row = await db.query.settings.findFirst();
  const key = row?.tmdbApiKey || null;
  cachedSettingsKey = { value: key, expiresAt: Date.now() + CACHE_TTL_MS };
  return key;
}

/** Settings DB key first, then .env — used by browse/search and other TMDB features. */
export async function getTmdbApiKey(): Promise<string | null> {
  if (cachedKey && Date.now() < cachedKey.expiresAt) return cachedKey.value;
  const row = await db.query.settings.findFirst();
  const key = row?.tmdbApiKey || process.env.TMDB_API_KEY || null;
  cachedKey = { value: key, expiresAt: Date.now() + CACHE_TTL_MS };
  return key;
}

export function invalidateTmdbKeyCache(): void {
  cachedKey = null;
  cachedSettingsKey = null;
}
