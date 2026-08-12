import { describe, expect, it } from "vitest";

import {
  filterSearchResultsByType,
  parseSearchRouteType,
  shouldLoadSearchResults,
  validateSearchRouteSearch,
} from "@/routes/helpers/search-route.helper";

describe("search-route.helper", () => {
  it("parses type and validates search", () => {
    expect(parseSearchRouteType("movie")).toBe("movie");
    expect(parseSearchRouteType("nope")).toBe("all");
    expect(validateSearchRouteSearch({ q: "dune", type: "tv" })).toEqual({ q: "dune", type: "tv" });
    expect(validateSearchRouteSearch({})).toEqual({ q: "", type: "all" });
  });

  it("gates loading and filters by type", () => {
    expect(shouldLoadSearchResults("a")).toBe(false);
    expect(shouldLoadSearchResults("ab")).toBe(true);
    const results = [
      { id: 1, type: "movie" as const },
      { id: 2, type: "tv" as const },
    ];
    expect(filterSearchResultsByType(results, "all")).toHaveLength(2);
    expect(filterSearchResultsByType(results, "movie")).toEqual([{ id: 1, type: "movie" }]);
  });
});
