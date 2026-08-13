import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}));

vi.mock("@/features/auth/auth-store", () => ({
  useAuth: {
    getState: () => authState,
  },
}));

const { Route } = await import("@/routes/_auth/signup");
const beforeLoad = Route.options.beforeLoad;

describe("signup route beforeLoad", () => {
  beforeEach(() => {
    authState.user = null;
  });

  it("always redirects to onboarding", async () => {
    await expect(beforeLoad?.({} as never)).rejects.toMatchObject({ options: { to: "/onboarding" } });
  });
});
