import { describe, expect, it } from "vitest";

import { listQueryToSorting, sortingToListQuery } from "./media-sort.helper";

describe("media-sort.helper", () => {
  it("converts table sorting to list query", () => {
    expect(sortingToListQuery([])).toEqual({});
    expect(sortingToListQuery([{ id: "unknown", desc: false }])).toEqual({});
    expect(sortingToListQuery([{ id: "info", desc: false }])).toEqual({ sortBy: "title", sortOrder: "asc" });
    expect(sortingToListQuery([{ id: "date", desc: true }])).toEqual({ sortBy: "date", sortOrder: "desc" });
  });

  it("converts list query back to sorting state", () => {
    expect(listQueryToSorting({})).toEqual([]);
    expect(listQueryToSorting({ sortBy: "title", sortOrder: "asc" })).toEqual([{ id: "info", desc: false }]);
    expect(listQueryToSorting({ sortBy: "score", sortOrder: "desc" })).toEqual([{ id: "score", desc: true }]);
  });
});
