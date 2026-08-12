import { describe, expect, it } from "vitest";

import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

describe("/downloads validateSearch", () => {
  it("accepts valid media types", () => {
    expect(validateDownloadsSearch({ type: "movie" })).toEqual({
      type: "movie",
      with_genres: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(validateDownloadsSearch({ type: "tv" })).toEqual({
      type: "tv",
      with_genres: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it("returns undefined type for invalid values", () => {
    expect(validateDownloadsSearch({ type: "invalid" })).toEqual({
      type: undefined,
      with_genres: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
    expect(validateDownloadsSearch({})).toEqual({
      type: undefined,
      with_genres: undefined,
      sortBy: undefined,
      sortOrder: undefined,
    });
  });

  it("parses genre and sort params", () => {
    expect(
      validateDownloadsSearch({
        type: "movie",
        with_genres: "Action",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toEqual({
      type: "movie",
      with_genres: "Action",
      sortBy: "title",
      sortOrder: "asc",
    });
  });
});
