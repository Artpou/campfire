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
    authState.user = { id: "o1", role: "owner" };
    expect(() => beforeLoad?.({} as never)).not.toThrow();
  });

  it("redirects member to settings", () => {
    authState.user = { id: "m1", role: "member" };
    expect(() => beforeLoad?.({} as never)).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/settings" }),
      }),
    );
  });
});
