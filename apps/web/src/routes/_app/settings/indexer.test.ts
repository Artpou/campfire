import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as { id: string; role: string } | null,
}));

vi.mock("@/features/auth/auth-store", () => ({
  useAuth: {
    getState: () => authState,
  },
}));

const { Route } = await import("@/routes/_app/settings/indexer");
const beforeLoad = Route.options.beforeLoad;

describe("settings/indexer beforeLoad", () => {
  beforeEach(() => {
    authState.user = null;
  });

  it("allows owner", () => {
    expect(() =>
      beforeLoad?.({
        context: { user: { id: "o1", role: "owner" } },
      } as never),
    ).not.toThrow();
  });

  it("allows admin", () => {
    expect(() =>
      beforeLoad?.({
        context: { user: { id: "a1", role: "admin" } },
      } as never),
    ).not.toThrow();
  });

  it("redirects member to settings", () => {
    expect(() =>
      beforeLoad?.({
        context: { user: { id: "m1", role: "member" } },
      } as never),
    ).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/settings/general" }),
      }),
    );
  });

  it("parses managerId search param", () => {
    const validateSearch = Route.options.validateSearch as (search: Record<string, unknown>) => {
      managerId?: string;
    };
    expect(validateSearch({ managerId: "abc" })).toEqual({ managerId: "abc" });
    expect(validateSearch({ managerId: 1 })).toEqual({ managerId: undefined });
  });
});
