import type { ListMediaQuery } from "@seedarr/contracts";
import type { SortingState } from "@tanstack/react-table";

const COLUMN_TO_SORT_BY: Record<string, NonNullable<ListMediaQuery["sortBy"]>> = {
  info: "title",
  date: "date",
  score: "score",
  progress: "progress",
};

export function sortingToListQuery(sorting: SortingState): Pick<ListMediaQuery, "sortBy" | "sortOrder"> {
  const first = sorting[0];
  if (!first) return {};
  const sortBy = COLUMN_TO_SORT_BY[first.id];
  if (!sortBy) return {};
  return {
    sortBy,
    sortOrder: first.desc ? "desc" : "asc",
  };
}

export function listQueryToSorting(query: Pick<ListMediaQuery, "sortBy" | "sortOrder">): SortingState {
  if (!query.sortBy) return [];
  const id = Object.entries(COLUMN_TO_SORT_BY).find(([, value]) => value === query.sortBy)?.[0];
  if (!id) return [];
  return [{ id, desc: query.sortOrder !== "asc" }];
}
