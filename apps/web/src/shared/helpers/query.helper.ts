import type { DiscoverQueryOptions } from "tmdb-ts";

/** Convert an options object into string query params for API calls. */
export function toApiQuery(options: DiscoverQueryOptions, base: Record<string, string> = {}): Record<string, string> {
  const query: Record<string, string> = { ...base };
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || key in base) continue;
    query[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return query;
}

/** Discover endpoints: options + page + locale. */
export function toDiscoverQuery(options: DiscoverQueryOptions, page: number, locale: string): Record<string, string> {
  return toApiQuery(options, { locale, page: page.toString() });
}
