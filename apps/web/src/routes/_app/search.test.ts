import { describe, expect, it } from "vitest";

import { shouldLoadSearchResults, validateSearchRouteSearch } from "@/routes/helpers/search-route.helper";

describe("/search validateSearch", () => {
  it("normalizes query and type", () => {
    expect(validateSearchRouteSearch({ q: "matrix", type: "tv" })).toEqual({ q: "matrix", type: "tv" });
  });

  it("defaults missing query to empty string and type to movie", () => {
    expect(validateSearchRouteSearch({})).toEqual({ q: "", type: "movie" });
    expect(validateSearchRouteSearch({ q: 123, type: "invalid" })).toEqual({ q: "", type: "movie" });
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
