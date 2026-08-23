import { BadRequestError } from "@/shared/errors/error";

import type { MediaEnriched } from "@/modules/media/media.types";

/** Progress ratio at which a watch is considered completed. */
export const WATCHED_RATIO = 0.95;

/** Parse YYYY-MM-DD into a local noon Date for review watchedAt. */
export function parseWatchedAt(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Assert media id is present on input payloads. */
export function assertMediaId(id: number | undefined | null): asserts id is number {
  if (id == null) throw new BadRequestError("Media ID is required");
}

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

    const merged = {
      ...item,
      ...enriched,
      ...(options?.preserveType && "type" in item ? { type: (item as { type: unknown }).type } : {}),
    } as T & { categories?: string | null };

    const itemCategories = "categories" in item ? (item as { categories?: string | null }).categories : undefined;
    if (!enriched.categories && itemCategories) {
      merged.categories = itemCategories;
    }

    return merged as T;
  });
}

/** True when progress is marked completed or position/duration crosses {@link WATCHED_RATIO}. */
export function isWatched(progress: { completed: boolean; position: number; duration: number } | undefined): boolean {
  if (!progress) return false;
  if (progress.completed) return true;
  if (progress.duration <= 0) return false;
  return progress.position / progress.duration >= WATCHED_RATIO;
}
