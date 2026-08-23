import { describe, expect, it } from "vitest";

import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

const EMPTY_FILTERS = {
  with_genres: undefined,
  release_date_gte: undefined,
  release_date_lte: undefined,
  with_runtime_gte: undefined,
  with_runtime_lte: undefined,
  vote_average_gte: undefined,
  sortBy: undefined,
  sortOrder: undefined,
};

describe("/downloads validateSearch", () => {
  it("accepts valid media types", () => {
    expect(validateDownloadsSearch({ type: "movie" })).toEqual({
      type: "movie",
      ...EMPTY_FILTERS,
    });
    expect(validateDownloadsSearch({ type: "tv" })).toEqual({
      type: "tv",
      ...EMPTY_FILTERS,
    });
  });

  it("returns undefined type for invalid values", () => {
    expect(validateDownloadsSearch({ type: "invalid" })).toEqual({
      type: undefined,
      ...EMPTY_FILTERS,
    });
    expect(validateDownloadsSearch({})).toEqual({
      type: undefined,
      ...EMPTY_FILTERS,
    });
  });

  it("parses genre, filter and sort params", () => {
    expect(
      validateDownloadsSearch({
        type: "movie",
        with_genres: "Action",
        release_date_gte: "2020-01-01",
        vote_average_gte: 7,
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toEqual({
      type: "movie",
      with_genres: "Action",
      release_date_gte: "2020-01-01",
      release_date_lte: undefined,
      with_runtime_gte: undefined,
      with_runtime_lte: undefined,
      vote_average_gte: 7,
      sortBy: "title",
      sortOrder: "asc",
    });
  });
});
