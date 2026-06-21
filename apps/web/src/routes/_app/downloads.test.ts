import { describe, expect, it } from "vitest";

import { validateDownloadsSearch } from "@/routes/helpers/downloads-route.helper";

describe("/downloads validateSearch", () => {
  it("accepts valid media types", () => {
    expect(validateDownloadsSearch({ type: "movie" })).toEqual({ type: "movie" });
    expect(validateDownloadsSearch({ type: "tv" })).toEqual({ type: "tv" });
  });

  it("returns undefined type for invalid values", () => {
    expect(validateDownloadsSearch({ type: "invalid" })).toEqual({ type: undefined });
    expect(validateDownloadsSearch({})).toEqual({ type: undefined });
  });
});
