import { describe, expect, it } from "vitest";

import {
  buildMovieDiscoverOptions,
  buildTvDiscoverOptions,
  filterSearchResultsByDiscoverFilters,
  isDiscoverTextSearch,
  isDownloadedTab,
  isMediaSelected,
  pickMovieFilters,
  pickTvFilters,
  validateMovieDiscoverSearch,
  validateTvDiscoverSearch,
} from "./discover-search.helper";

describe("discover-search.helper", () => {
  it("validates discover search params", () => {
    expect(isDiscoverTextSearch("a")).toBe(false);
    expect(isDiscoverTextSearch("ab")).toBe(true);
    expect(isMediaSelected("new")).toBe(true);
    expect(isMediaSelected("nope")).toBe(false);
    expect(isDownloadedTab("downloaded")).toBe(true);

    expect(validateMovieDiscoverSearch({ selected: "top-rated", q: "dune", with_genres: "28" })).toMatchObject({
      selected: "top-rated",
      q: "dune",
      with_genres: "28",
    });
    expect(validateTvDiscoverSearch({ selected: "bad", first_air_date_gte: "2020-01-01" })).toMatchObject({
      selected: "new",
      first_air_date_gte: "2020-01-01",
    });
  });

  it("builds discover options for tabs", () => {
    const movie = buildMovieDiscoverOptions({ selected: "upcoming", with_genres: "28" });
    expect(movie.sort_by).toBe("popularity.desc");
    expect(movie["primary_release_date.gte"]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(movie.with_genres).toBe("28");

    const downloaded = buildMovieDiscoverOptions({ selected: "downloaded", with_genres: "28" });
    expect(downloaded.with_genres).toBeUndefined();

    const tv = buildTvDiscoverOptions({ selected: "top-rated", vote_average_gte: 7 });
    expect(tv.sort_by).toBe("vote_average.desc");
    expect(tv["vote_average.gte"]).toBe(7);
  });

  it("picks filter subsets", () => {
    expect(pickMovieFilters({ release_date_gte: "2020-01-01", with_genres: "28", selected: "new" })).toEqual({
      release_date_gte: "2020-01-01",
      release_date_lte: undefined,
      with_genres: "28",
      with_watch_providers: undefined,
      with_keywords: undefined,
      with_keywords_label: undefined,
      with_runtime_gte: undefined,
      with_runtime_lte: undefined,
      vote_average_gte: undefined,
    });
    expect(pickTvFilters({ first_air_date_lte: "2021-01-01" }).first_air_date_lte).toBe("2021-01-01");
  });

  it("filters search results client-side", () => {
    const genreNameById = new Map([["28", "Action"]]);
    const results = [
      { id: 1, categories: "Action", vote_average: 8, release_date: "2020-01-01", duration: 100 },
      { id: 2, categories: "Drama", vote_average: 5, release_date: "2010-01-01", duration: 80 },
    ] as never[];

    expect(
      filterSearchResultsByDiscoverFilters(
        results,
        { with_genres: "28", vote_average_gte: 7, date_gte: "2015-01-01", with_runtime_gte: 90 },
        genreNameById,
      ),
    ).toHaveLength(1);
  });
});
