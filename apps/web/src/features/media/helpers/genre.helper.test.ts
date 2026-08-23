import { describe, expect, it } from "vitest";

import { isGenreInSelection, mergeGenresByName, toggleGenreSelection } from "./genre.helper";

describe("mergeGenresByName", () => {
  it("merges movie and tv genres with the same name", () => {
    const merged = mergeGenresByName([{ id: 28, name: "Action" }], [{ id: 12, name: "Action" }]);

    expect(merged).toEqual([{ id: "28|12", name: "Action", movieId: 28, tvId: 12 }]);
  });

  it("keeps distinct genres when names differ", () => {
    const merged = mergeGenresByName([{ id: 28, name: "Action" }], [{ id: 16, name: "Animation" }]);

    expect(merged).toEqual([
      { id: "28", name: "Action", movieId: 28 },
      { id: "16", name: "Animation", tvId: 16 },
    ]);
  });
});

describe("toggleGenreSelection", () => {
  it("toggles genre ids for multi-select", () => {
    const genre = { id: "28", name: "Action", movieId: 28 };
    expect(toggleGenreSelection(genre, "id", undefined)).toBe("28");
    expect(toggleGenreSelection(genre, "id", "28")).toBeUndefined();
    expect(toggleGenreSelection({ id: "12", name: "Comedy", movieId: 12 }, "id", "28")).toBe("28|12");
  });
});

describe("isGenreInSelection", () => {
  it("detects selected genre by id", () => {
    const genre = { id: "28|12", name: "Action", movieId: 28, tvId: 12 };
    expect(isGenreInSelection(genre, "id", "28|12")).toBe(true);
    expect(isGenreInSelection(genre, "id", "28")).toBe(true);
  });
});
