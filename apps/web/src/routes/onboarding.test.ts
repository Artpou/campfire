import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as {
    id: string;
    username: string;
    role: "owner" | "admin" | "member" | "viewer";
    createdAt: string;
    countIndexerManagers: number;
    onboarded: boolean;
  } | null,
}));

vi.mock("@/features/auth/auth-store", () => ({
  useAuth: Object.assign((selector: (state: typeof authState) => unknown) => selector(authState), {
    getState: () => ({
      ...authState,
      setUser: (user: typeof authState.user) => {
        authState.user = user;
      },
      logout: () => {
        authState.user = null;
      },
    }),
  }),
}));

const hasOwner = vi.hoisted(() => vi.fn());

vi.mock("@seedarr/sdk", () => ({
  api: {
    auth: {
      "has-owner": {
        $get: () => Promise.resolve({}),
      },
      me: {
        $get: () => Promise.resolve({}),
      },
    },
  },
  unwrap: (promise: Promise<unknown>) => promise.then(() => hasOwner()),
}));

const { Route } = await import("@/routes/onboarding");
const beforeLoad = Route.options.beforeLoad;

function createContext(ensureQueryData: QueryClient["ensureQueryData"], removeQueries = vi.fn()) {
  return {
    queryClient: { ensureQueryData, removeQueries } as unknown as QueryClient,
    language: "en-US",
  };
}

const ownerNotOnboarded = {
  id: "user-1",
  username: "owner",
  role: "owner" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
  countIndexerManagers: 0,
  onboarded: false,
};

const ownerOnboarded = {
  ...ownerNotOnboarded,
  onboarded: true,
  countIndexerManagers: 1,
};

describe("onboarding route beforeLoad", () => {
  beforeEach(() => {
    authState.user = null;
    hasOwner.mockReset();
  });

  it("allows first-time setup when no owner and unauthenticated", async () => {
    hasOwner.mockResolvedValue({ hasOwner: false });
    const ensureQueryData = vi.fn().mockRejectedValue(new Error("Unauthorized"));

    const result = await beforeLoad?.({
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: null, hasOwner: false });
  });

  it("redirects unauthenticated users to login when an owner exists", async () => {
    hasOwner.mockResolvedValue({ hasOwner: true });
    const ensureQueryData = vi.fn().mockRejectedValue(new Error("Unauthorized"));

    await expect(
      beforeLoad?.({
        context: createContext(ensureQueryData),
      } as never),
    ).rejects.toMatchObject({ options: { to: "/login" } });
  });

  it("allows authenticated users who are not onboarded", async () => {
    hasOwner.mockResolvedValue({ hasOwner: true });
    const ensureQueryData = vi.fn().mockResolvedValue(ownerNotOnboarded);

    const result = await beforeLoad?.({
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: ownerNotOnboarded, hasOwner: true });
    expect(authState.user).toEqual(ownerNotOnboarded);
  });

  it("redirects onboarded users home", async () => {
    hasOwner.mockResolvedValue({ hasOwner: true });
    const ensureQueryData = vi.fn().mockResolvedValue(ownerOnboarded);

    await expect(
      beforeLoad?.({
        context: createContext(ensureQueryData),
      } as never),
    ).rejects.toMatchObject({ options: { to: "/" } });
  });
});
