import { eq } from "drizzle-orm";

import { createCache } from "@/shared/helpers/cache.helper";

import { db } from "@/db/db";
import { module } from "@/modules/module/module.schema";
import { ensureSystemModules } from "@/modules/module/module.seed";

interface CachedKey {
  value: string | null;
}

const cache = createCache<CachedKey>({
  max: 1,
  ttl: 60_000,
  name: "tmdb-key",
});

/** Module `apiKey` override → `TMDB_API_KEY` env. Empty module key counts as unset. */
export async function getTmdbApiKey(): Promise<string | null> {
  const cached = cache.get("full");
  if (cached) return cached.value;

  await ensureSystemModules();
  const row = await db.query.module.findFirst({ where: eq(module.type, "tmdb") });
  const moduleKey = (row?.config as { apiKey?: string } | undefined)?.apiKey?.trim();
  const key = moduleKey || process.env.TMDB_API_KEY || null;
  cache.set("full", { value: key });
  return key;
}

export function invalidateTmdbKeyCache(): void {
  cache.clear();
}
