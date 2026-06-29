export type SearchRouteType = "all" | "movie" | "tv";

export type SearchRouteSearch = {
  q: string;
  type: SearchRouteType;
};

export function parseSearchRouteType(type: unknown): SearchRouteType {
  if (type === "all" || type === "movie" || type === "tv") return type;
  return "all";
}

export function validateSearchRouteSearch(search: Record<string, unknown>): SearchRouteSearch {
  return {
    q: typeof search.q === "string" ? search.q : "",
    type: parseSearchRouteType(search.type),
  };
}

export function shouldLoadSearchResults(query: string): boolean {
  return query.trim().length >= 2;
}

export function filterSearchResultsByType<T extends { type: "movie" | "tv" }>(
  results: T[],
  type: SearchRouteType,
): T[] {
  if (type === "all") return results;
  return results.filter((item) => item.type === type);
}
