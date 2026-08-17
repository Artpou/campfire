import ms from "ms";

import { createCache } from "@/shared/helpers/cache.helper";

const CINEMETA_BASE = "https://v3-cinemeta.strem.io/meta";
const FETCH_TIMEOUT_MS = 8_000;

type CachedImdbRating = {
  imdbId: string;
  rating: number | null;
};

const cache = createCache<CachedImdbRating>({
  max: 500,
  ttl: ms("6h"),
  name: "cinemeta-imdb-rating",
});

/** Fetch IMDb rating from Cinemeta (cached). Returns null on failure. */
export async function fetchImdbRating(imdbId: string | null | undefined, type: "movie" | "tv"): Promise<number | null> {
  const normalizedId = imdbId?.trim();
  if (!normalizedId || !/^tt\d+$/i.test(normalizedId)) return null;

  const cinemetaType = type === "tv" ? "series" : "movie";
  const cacheKey = `${cinemetaType}:${normalizedId.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.rating;

  const url = `${CINEMETA_BASE}/${cinemetaType}/${normalizedId}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      meta?: { imdbRating?: string | number | null; imdb_id?: string };
    };

    const raw = payload.meta?.imdbRating;
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number.parseFloat(raw) : Number.NaN;
    const rating = Number.isFinite(parsed) ? parsed : null;

    cache.set(cacheKey, {
      imdbId: payload.meta?.imdb_id || normalizedId,
      rating,
    });
    return rating;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
