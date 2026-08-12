import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/request/components/request-grid", () => ({ RequestGrid: () => null }));
vi.mock("@/features/request/components/request-tabs", () => ({ RequestTabs: () => null }));
vi.mock("@/features/request/hooks/request.queries", () => ({
  requestQueries: { list: () => ({ queryKey: ["requests"] }) },
}));

const { Route } = await import("@/routes/_app/requests");
const beforeLoad = Route.options.beforeLoad;

describe("requests route beforeLoad", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin", () => {
    expect(() =>
      beforeLoad?.({
        context: { user: { id: "a1", role: "admin" } },
      } as never),
    ).not.toThrow();
  });

  it("redirects member to movies", () => {
    expect(() =>
      beforeLoad?.({
        context: { user: { id: "m1", role: "member" } },
      } as never),
    ).toThrow(
      expect.objectContaining({
        options: expect.objectContaining({ to: "/movies" }),
      }),
    );
  });
});
