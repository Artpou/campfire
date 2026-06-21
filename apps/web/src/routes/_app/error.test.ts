import { describe, expect, it } from "vitest";

import { validateErrorSearch } from "@/routes/helpers/error-route.helper";

describe("/error validateSearch", () => {
  it("passes through string message", () => {
    expect(validateErrorSearch({ message: "Something broke" })).toEqual({ message: "Something broke" });
  });

  it("drops non-string message", () => {
    expect(validateErrorSearch({ message: 500 })).toEqual({ message: undefined });
    expect(validateErrorSearch({})).toEqual({ message: undefined });
  });
});
