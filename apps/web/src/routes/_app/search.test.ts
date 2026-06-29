import { describe, expect, it } from "vitest";

import {
  filterSearchResultsByType,
  parseSearchRouteType,
  shouldLoadSearchResults,
  validateSearchRouteSearch,
} from "@/routes/helpers/search-route.helper";

describe("/search validateSearch", () => {
  it("normalizes query and type", () => {
    expect(validateSearchRouteSearch({ q: "matrix", type: "tv" })).toEqual({ q: "matrix", type: "tv" });
    expect(validateSearchRouteSearch({ q: "matrix", type: "all" })).toEqual({ q: "matrix", type: "all" });
  });

  it("defaults missing query to empty string and type to all", () => {
    expect(validateSearchRouteSearch({})).toEqual({ q: "", type: "all" });
    expect(validateSearchRouteSearch({ q: 123, type: "invalid" })).toEqual({ q: "", type: "all" });
  });
});

describe("parseSearchRouteType", () => {
  it("accepts all, movie and tv", () => {
    expect(parseSearchRouteType("all")).toBe("all");
    expect(parseSearchRouteType("movie")).toBe("movie");
    expect(parseSearchRouteType("tv")).toBe("tv");
    expect(parseSearchRouteType("other")).toBe("all");
  });
});

describe("filterSearchResultsByType", () => {
  it("returns all results when type is all", () => {
    const results = [
      { type: "movie" as const, id: 1 },
      { type: "tv" as const, id: 2 },
    ];
    expect(filterSearchResultsByType(results, "all")).toHaveLength(2);
    expect(filterSearchResultsByType(results, "movie")).toEqual([{ type: "movie", id: 1 }]);
  });
});

describe("/search loader", () => {
  it("loads trending data when query is too short", () => {
    expect(shouldLoadSearchResults("")).toBe(false);
    expect(shouldLoadSearchResults("a")).toBe(false);
    expect(shouldLoadSearchResults("  x ")).toBe(false);
  });

  it("loads search results when query is long enough", () => {
    expect(shouldLoadSearchResults("ab")).toBe(true);
    expect(shouldLoadSearchResults("matrix")).toBe(true);
  });
});
