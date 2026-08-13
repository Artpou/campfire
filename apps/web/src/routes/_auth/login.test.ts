import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}));

vi.mock("@/features/auth/auth-store", () => ({
  useAuth: {
    getState: () => authState,
  },
}));

const hasOwner = vi.hoisted(() => vi.fn());

vi.mock("@seedarr/sdk", () => ({
  api: {
    auth: {
      "has-owner": {
        $get: () => Promise.resolve({}),
      },
    },
  },
  unwrap: (promise: Promise<unknown>) => promise.then(() => hasOwner()),
}));

const { Route } = await import("@/routes/_auth/login");
const beforeLoad = Route.options.beforeLoad;

describe("login route beforeLoad", () => {
  beforeEach(() => {
    authState.user = null;
    hasOwner.mockReset();
  });

  it("redirects authenticated users home", async () => {
    authState.user = { id: "u1" };

    await expect(beforeLoad?.({} as never)).rejects.toMatchObject({ options: { to: "/" } });
  });

  it("redirects to onboarding when no owner exists", async () => {
    hasOwner.mockResolvedValue({ hasOwner: false });

    await expect(beforeLoad?.({} as never)).rejects.toMatchObject({ options: { to: "/onboarding" } });
  });

  it("allows login when owner exists", async () => {
    hasOwner.mockResolvedValue({ hasOwner: true });

    await expect(beforeLoad?.({} as never)).resolves.toBeUndefined();
  });
});
