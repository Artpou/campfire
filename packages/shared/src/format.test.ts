import { describe, expect, it } from "vitest";

import { formatBytes, formatRuntime, formatTime } from "./format";

describe("formatBytes", () => {
  it("returns 0 B for falsy values", () => {
    expect(formatBytes(undefined)).toBe("0 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats byte sizes", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1_048_576)).toBe("1.00 MB");
  });
});

describe("formatTime", () => {
  it("returns infinity symbol for invalid values", () => {
    expect(formatTime(undefined)).toBe("∞");
    expect(formatTime(-1)).toBe("∞");
  });

  it("formats durations", () => {
    expect(formatTime(45_000)).toBe("45s");
    expect(formatTime(125_000)).toBe("2m 5s");
    expect(formatTime(3_725_000)).toBe("1h 2m");
  });
});

describe("formatRuntime", () => {
  it("returns N/A for invalid values", () => {
    expect(formatRuntime(null)).toBe("N/A");
    expect(formatRuntime(0)).toBe("N/A");
  });

  it("formats minutes as hours and minutes", () => {
    expect(formatRuntime(125)).toBe("2h 05min");
  });
});
