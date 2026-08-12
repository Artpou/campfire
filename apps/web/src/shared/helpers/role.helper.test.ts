import { describe, expect, it } from "vitest";

import { redirectIfNotRole } from "./role.helper";

describe("redirectIfNotRole", () => {
  it("allows sufficient roles", () => {
    expect(() => redirectIfNotRole({ user: { role: "admin" } as never }, "admin", { to: "/settings" })).not.toThrow();
    expect(() => redirectIfNotRole({ user: { role: "owner" } as never }, "admin", { to: "/settings" })).not.toThrow();
  });

  it("redirects insufficient roles", () => {
    expect(() => redirectIfNotRole({ user: { role: "member" } as never }, "admin", { to: "/settings" })).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/settings" }),
      }),
    );
  });
});
