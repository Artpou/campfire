import { createCache } from "@/shared/helpers/cache.helper";

import { moduleRepository } from "@/modules/module/module.repository";

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

  const config = await moduleRepository.getConfig<{ apiKey?: string }>("tmdb");
  const moduleKey = config?.apiKey?.trim();
  const key = moduleKey || process.env.TMDB_API_KEY || null;
  cache.set("full", { value: key });
  return key;
}

export function invalidateTmdbKeyCache(): void {
  cache.clear();
}
