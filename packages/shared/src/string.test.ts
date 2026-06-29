import { describe, expect, it } from "vitest";

import { parseString, slugify, toLatin } from "./string";

describe("parseString", () => {
  it("returns undefined for empty or non-string values", () => {
    expect(parseString("")).toBeUndefined();
    expect(parseString(42)).toBeUndefined();
  });

  it("returns non-empty strings", () => {
    expect(parseString("hello")).toBe("hello");
  });
});

describe("toLatin", () => {
  it("strips accents and special characters", () => {
    expect(toLatin("Café résumé!")).toBe("Cafe resume");
  });

  it("returns undefined when nothing remains", () => {
    expect(toLatin("!!!")).toBeUndefined();
  });
});

describe("slugify", () => {
  it("normalizes text into a slug", () => {
    expect(slugify("Hello World")).toBe("Hello World");
  });

  it("returns null when slug has no latin characters", () => {
    expect(slugify("日本語")).toBeNull();
  });
});
