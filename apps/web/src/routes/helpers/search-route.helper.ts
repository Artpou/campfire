import { getMediaType } from "@/features/media/helpers/media.helper";

export type SearchRouteSearch = {
  q: string;
  type: "movie" | "tv";
};

export function validateSearchRouteSearch(search: Record<string, unknown>): SearchRouteSearch {
  return {
    q: typeof search.q === "string" ? search.q : "",
    type: getMediaType(search.type) || "movie",
  };
}

export function shouldLoadSearchResults(query: string): boolean {
  return query.trim().length >= 2;
}
