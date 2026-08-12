import { ApiError } from "@seedarr/sdk";
import { describe, expect, it } from "vitest";

import { getErrorMessage, isRouteForbidden, isRouteNotFound } from "./error.helper";

describe("error.helper", () => {
  it("extracts error messages", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("x")).toBeTruthy();
  });

  it("detects API 404/403 through cause chain", () => {
    const notFound = new ApiError("missing", 404);
    const wrapped = new Error("route", { cause: notFound });
    expect(isRouteNotFound(wrapped)).toBe(true);
    expect(isRouteForbidden(new ApiError("nope", 403))).toBe(true);
    expect(isRouteForbidden(new Error("plain"))).toBe(false);
  });
});
