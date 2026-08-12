import { describe, expect, it } from "vitest";

import { toPaginationQuery } from "./pagination.helper";
import { toApiQuery, toDiscoverQuery } from "./query.helper";

describe("query helpers", () => {
  it("toApiQuery stringifies values and skips undefined", () => {
    expect(toApiQuery({ sort_by: "popularity.desc", with_genres: undefined }, { locale: "en-US" })).toEqual({
      locale: "en-US",
      sort_by: "popularity.desc",
    });
    expect(toApiQuery({ with_companies: [1, 2] } as never)).toEqual({ with_companies: "1,2" });
  });

  it("toDiscoverQuery adds page and locale", () => {
    expect(toDiscoverQuery({ sort_by: "vote_average.desc" }, 2, "fr-FR")).toEqual({
      locale: "fr-FR",
      page: "2",
      sort_by: "vote_average.desc",
    });
  });

  it("toPaginationQuery maps page/limit", () => {
    expect(toPaginationQuery({ type: "movie", limit: 10 }, { pageParam: 3 })).toEqual({
      type: "movie",
      page: "3",
      limit: "10",
    });
    expect(toPaginationQuery({ type: "tv" }, {})).toEqual({
      type: "tv",
      page: "1",
      limit: "20",
    });
  });
});
