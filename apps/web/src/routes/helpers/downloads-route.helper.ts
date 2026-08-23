import type { ListMediaQuery } from "@seedarr/contracts";
import { parseNumber, parseString } from "@seedarr/shared";

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
    release_date_gte: parseString(search.release_date_gte),
    release_date_lte: parseString(search.release_date_lte),
    with_runtime_gte: parseNumber(search.with_runtime_gte),
    with_runtime_lte: parseNumber(search.with_runtime_lte),
    vote_average_gte: parseNumber(search.vote_average_gte),
    sortBy: parseSortBy(search.sortBy),
    sortOrder: parseSortOrder(search.sortOrder),
  };
}
