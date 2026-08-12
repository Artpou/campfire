import { describe, expect, it } from "vitest";

import { buildStreamHeaders, isFsNotFoundError, parseRangeHeader } from "./streaming.helper";

describe("streaming.helper", () => {
  describe("parseRangeHeader", () => {
    it("returns undefined without header", () => {
      expect(parseRangeHeader(undefined, 100)).toBeUndefined();
    });

    it("parses a closed range", () => {
      expect(parseRangeHeader("bytes=0-9", 100)).toEqual({ start: 0, end: 9 });
    });

    it("defaults end to size-1 for open range", () => {
      expect(parseRangeHeader("bytes=50-", 100)).toEqual({ start: 50, end: 99 });
    });

    it("returns unsatisfiable for invalid ranges", () => {
      expect(parseRangeHeader("bytes=200-300", 100)).toBe("unsatisfiable");
      expect(parseRangeHeader("bytes=abc-def", 100)).toBe("unsatisfiable");
    });
  });

  describe("buildStreamHeaders", () => {
    it("builds full-file headers", () => {
      expect(buildStreamHeaders("movie.mp4", 1000)).toMatchObject({
        "Content-Type": "video/mp4",
        "Content-Length": "1000",
        "Accept-Ranges": "bytes",
      });
    });

    it("builds partial-content headers", () => {
      expect(buildStreamHeaders("movie.mkv", 1000, { start: 0, end: 99 })).toMatchObject({
        "Content-Type": "video/x-matroska",
        "Content-Range": "bytes 0-99/1000",
        "Content-Length": "100",
      });
    });
  });

  describe("isFsNotFoundError", () => {
    it("detects ENOENT / ENOTDIR", () => {
      expect(isFsNotFoundError({ code: "ENOENT" })).toBe(true);
      expect(isFsNotFoundError({ code: "ENOTDIR" })).toBe(true);
      expect(isFsNotFoundError({ code: "EACCES" })).toBe(false);
      expect(isFsNotFoundError("nope")).toBe(false);
    });
  });
});
