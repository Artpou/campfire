import { describe, expect, it } from "vitest";

import { getVideoInputFormat } from "./video.helper";

describe("getVideoInputFormat", () => {
  it("maps mkv to matroska", () => {
    expect(getVideoInputFormat("movie.mkv")).toBe("matroska");
  });

  it("maps mp4 to mp4", () => {
    expect(getVideoInputFormat("movie.mp4")).toBe("mp4");
  });

  it("maps webm to matroska", () => {
    expect(getVideoInputFormat("movie.webm")).toBe("matroska");
  });

  it("returns undefined for unknown extensions", () => {
    expect(getVideoInputFormat("movie.txt")).toBeUndefined();
  });
});
