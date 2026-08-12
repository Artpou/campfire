import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/request/components/request-grid", () => ({ RequestGrid: () => null }));
vi.mock("@/features/request/components/request-tabs", () => ({ RequestTabs: () => null }));
vi.mock("@/features/request/hooks/request.queries", () => ({
  requestQueries: {
    byUser: () => ({ queryKey: ["requests", "user"] }),
    mine: () => ({ queryKey: ["requests", "mine"] }),
  },
}));
vi.mock("@/features/user/hooks/user.queries", () => ({
  userQueries: {
    details: (id: string) => ({ queryKey: ["user", id] }),
  },
}));
vi.mock("@/features/auth/auth-store", () => ({
  useAuth: Object.assign(() => null, { getState: () => ({ user: null }) }),
}));

const { Route } = await import("@/routes/_app/user/$id.requests");
const beforeLoad = Route.options.beforeLoad;

describe("user/$id/requests beforeLoad", () => {
  it("allows viewing own requests", () => {
    expect(() =>
      beforeLoad?.({
        params: { id: "u1" },
        context: { user: { id: "u1", role: "member" } },
      } as never),
    ).not.toThrow();
  });

  it("allows admin viewing another user's requests", () => {
    expect(() =>
      beforeLoad?.({
        params: { id: "u2" },
        context: { user: { id: "u1", role: "admin" } },
      } as never),
    ).not.toThrow();
  });

  it("redirects non-admin away from another user's requests", () => {
    expect(() =>
      beforeLoad?.({
        params: { id: "u2" },
        context: { user: { id: "u1", role: "member" } },
      } as never),
    ).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/movies" }),
      }),
    );
  });
});
