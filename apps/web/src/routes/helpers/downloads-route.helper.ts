import type { ListMediaQuery } from "@seedarr/contracts";
import { parseString } from "@seedarr/shared";

import { getMediaType } from "@/features/media/helpers/media.helper";

const SORT_BY = ["title", "date", "score", "progress"] as const;
const SORT_ORDER = ["asc", "desc"] as const;

function parseSortBy(value: unknown): ListMediaQuery["sortBy"] {
  if (typeof value !== "string") return undefined;
  return (SORT_BY as readonly string[]).includes(value) ? (value as ListMediaQuery["sortBy"]) : undefined;
}

function parseSortOrder(value: unknown): ListMediaQuery["sortOrder"] {
  if (typeof value !== "string") return undefined;
  return (SORT_ORDER as readonly string[]).includes(value) ? (value as ListMediaQuery["sortOrder"]) : undefined;
}

export function validateDownloadsSearch(search: Record<string, unknown>): Partial<ListMediaQuery> {
  return {
    type: getMediaType(search.type),
    with_genres: parseString(search.with_genres),
    sortBy: parseSortBy(search.sortBy),
    sortOrder: parseSortOrder(search.sortOrder),
  };
}
