import type { MediaEnriched } from "@/modules/media/media.types";

/**
 * Merge TMDB/list items with DB-enriched media rows (likes, watchlist, download, progress).
 * When `preserveType` is true (person filmography), keep the item's media type over the DB row.
 */
export function mergeMediaEnrichment<T extends { id: number }>(
  items: T[],
  mediaMap: MediaEnriched[],
  options?: { preserveType?: boolean },
): T[] {
  return items.map((item) => {
    const enriched = mediaMap.find((m) => m.id === item.id);
    if (!enriched) return item;
    if (options?.preserveType && "type" in item) {
      return { ...item, ...enriched, type: (item as { type: unknown }).type } as T;
    }
    return enriched as unknown as T;
  });
}
