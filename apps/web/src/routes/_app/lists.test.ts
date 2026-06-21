import { describe, expect, it } from "vitest";

import { validateListsSearch } from "@/routes/helpers/lists-route.helper";

describe("/lists validateSearch", () => {
  it("accepts valid tabs", () => {
    expect(validateListsSearch({ tab: "like" })).toEqual({ tab: "like" });
    expect(validateListsSearch({ tab: "watch-list" })).toEqual({ tab: "watch-list" });
  });

  it("falls back to watch-list for invalid tab", () => {
    expect(validateListsSearch({ tab: "invalid" })).toEqual({ tab: "watch-list" });
    expect(validateListsSearch({})).toEqual({ tab: "watch-list" });
  });
});
