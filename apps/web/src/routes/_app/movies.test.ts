import { describe, expect, it, vi } from "vitest";

import {
  buildMovieDiscoverOptions,
  isMediaSelected,
  validateMovieDiscoverSearch,
} from "@/features/media/helpers/discover-search.helper";

describe("/movies validateSearch", () => {
  it("parses valid discover search params", () => {
    expect(
      validateMovieDiscoverSearch({
        selected: "top-rated",
        with_genres: "28",
        with_watch_providers: "8",
        release_date_gte: "2020-01-01",
        with_runtime_gte: 60,
        vote_average_gte: 7,
      }),
    ).toEqual({
      selected: "top-rated",
      with_genres: "28",
      with_watch_providers: "8",
      release_date_gte: "2020-01-01",
      release_date_lte: undefined,
      with_original_language: undefined,
      with_keywords: undefined,
      with_keywords_label: undefined,
      with_runtime_gte: 60,
      with_runtime_lte: undefined,
      vote_average_gte: 7,
    });
  });

  it("falls back to home when selected is invalid", () => {
    expect(validateMovieDiscoverSearch({ selected: "invalid" }).selected).toBe("home");
  });

  it("maps top-rated tab to vote sort", () => {
    expect(buildMovieDiscoverOptions({ selected: "top-rated" })).toMatchObject({
      sort_by: "vote_average.desc",
    });
  });

  it("maps cinema tab to release type 3", () => {
    expect(buildMovieDiscoverOptions({ selected: "cinema" })).toMatchObject({
      with_release_type: "3",
    });
  });

  it("sets upcoming release date filter from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00Z"));

    expect(buildMovieDiscoverOptions({ selected: "upcoming" })).toMatchObject({
      "primary_release_date.gte": "2024-03-15",
    });

    vi.useRealTimers();
  });

  it("accepts known tabs only", () => {
    expect(isMediaSelected("home")).toBe(true);
    expect(isMediaSelected("unknown")).toBe(false);
  });
});
