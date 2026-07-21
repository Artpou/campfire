import { sanitize } from "@/helpers/string.helper";

export type MediaSearchTitles = {
  imdbId?: string | null;
  sanitize_title?: string | null;
  title?: string | null;
};

export type IndexerSearchPlan = {
  imdbQuery: string | null;
  /** Prefer sanitize_title (original), else display title. */
  primaryTitle: string | null;
  /** Distinct display title — only searched when primaryTitle returned nothing. */
  fallbackTitles: string[];
};

/**
 * Build a cascading search plan: imdb + best title first, alternate title only as fallback.
 * Dedupes when sanitize_title and title normalize to the same string.
 */
export function buildIndexerSearchPlan(
  media: MediaSearchTitles,
  formatImdbQuery: (imdbId: string) => string = (id) => id,
): IndexerSearchPlan {
  const imdbId = media.imdbId?.trim() || "";
  const primaryTitle = sanitize(media.sanitize_title ?? "") || sanitize(media.title ?? "") || null;
  const alternateTitle = sanitize(media.title ?? "") || null;

  return {
    imdbQuery: imdbId ? formatImdbQuery(imdbId) : null,
    primaryTitle,
    fallbackTitles: alternateTitle && alternateTitle !== primaryTitle ? [alternateTitle] : [],
  };
}

/**
 * Search imdb + primary title in parallel, then fallback titles only when the primary
 * title search returned nothing (imdb-only hits still allow a title fallback).
 */
export async function searchWithTitleFallback<T>(
  plan: IndexerSearchPlan,
  search: (query: string) => Promise<T[]>,
): Promise<T[]> {
  const firstWave = [plan.imdbQuery, plan.primaryTitle].filter((q): q is string => Boolean(q));
  if (firstWave.length === 0 && plan.fallbackTitles.length === 0) return [];

  const [imdbResults, primaryTitleResults] = await Promise.all([
    plan.imdbQuery ? search(plan.imdbQuery) : Promise.resolve([]),
    plan.primaryTitle ? search(plan.primaryTitle) : Promise.resolve([]),
  ]);

  if (primaryTitleResults.length > 0 || plan.fallbackTitles.length === 0) {
    return [...imdbResults, ...primaryTitleResults];
  }

  const fallbackResults = (await Promise.all(plan.fallbackTitles.map((query) => search(query)))).flat();
  return [...imdbResults, ...primaryTitleResults, ...fallbackResults];
}
