import type { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  user: null as {
    id: string;
    username: string;
    role: "owner" | "admin" | "member" | "viewer";
    createdAt: string;
    countIndexerManagers: number;
  } | null,
  onboarded: false,
}));

vi.mock("@/features/auth/auth-store", () => ({
  useAuth: Object.assign((selector: (state: typeof authState) => unknown) => selector(authState), {
    getState: () => ({
      ...authState,
      setUser: (user: typeof authState.user) => {
        authState.user = user;
      },
      setOnboarded: () => {
        authState.onboarded = true;
      },
      logout: () => {
        authState.user = null;
      },
    }),
    setState: (partial: Partial<typeof authState>) => {
      Object.assign(authState, partial);
    },
  }),
}));

const { Route } = await import("@/routes/_app");

const beforeLoad = Route.options.beforeLoad;

function createContext(ensureQueryData: QueryClient["ensureQueryData"]) {
  return {
    queryClient: { ensureQueryData } as unknown as QueryClient,
    language: "en-US",
  };
}

const ownerWithoutIndexers = {
  id: "user-1",
  username: "owner",
  role: "owner" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
  countIndexerManagers: 0,
};

const memberUser = {
  id: "user-2",
  username: "member",
  role: "member" as const,
  createdAt: "2024-01-01T00:00:00.000Z",
  countIndexerManagers: 0,
};

describe("_app route beforeLoad", () => {
  beforeEach(() => {
    authState.user = null;
    authState.onboarded = false;
  });

  it("returns user when authenticated", async () => {
    const ensureQueryData = vi.fn().mockResolvedValue({
      ...ownerWithoutIndexers,
      countIndexerManagers: 1,
    });

    const result = await beforeLoad?.({
      location: { pathname: "/movies" },
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: { ...ownerWithoutIndexers, countIndexerManagers: 1 } });
    expect(authState.user).toEqual({ ...ownerWithoutIndexers, countIndexerManagers: 1 });
  });

  it("redirects to login when auth fails", async () => {
    const ensureQueryData = vi.fn().mockRejectedValue(new Error("Unauthorized"));

    await expect(
      beforeLoad?.({
        location: { pathname: "/movies" },
        context: createContext(ensureQueryData),
      } as never),
    ).rejects.toMatchObject({ options: { to: "/login" } });

    expect(authState.user).toBeNull();
  });

  it("redirects admin without indexers to onboarding", async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(ownerWithoutIndexers);

    await expect(
      beforeLoad?.({
        location: { pathname: "/movies" },
        context: createContext(ensureQueryData),
      } as never),
    ).rejects.toMatchObject({ options: { to: "/onboarding" } });
  });

  it("skips onboarding redirect when already on onboarding page", async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(ownerWithoutIndexers);

    const result = await beforeLoad?.({
      location: { pathname: "/onboarding" },
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: ownerWithoutIndexers });
  });

  it("skips onboarding redirect when user marked onboarded", async () => {
    authState.onboarded = true;
    const ensureQueryData = vi.fn().mockResolvedValue(ownerWithoutIndexers);

    const result = await beforeLoad?.({
      location: { pathname: "/movies" },
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: ownerWithoutIndexers });
  });

  it("skips onboarding redirect when indexers are configured", async () => {
    const ensureQueryData = vi.fn().mockResolvedValue({
      ...ownerWithoutIndexers,
      countIndexerManagers: 2,
    });

    const result = await beforeLoad?.({
      location: { pathname: "/movies" },
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({
      user: {
        ...ownerWithoutIndexers,
        countIndexerManagers: 2,
      },
    });
  });

  it("does not redirect members without indexers", async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(memberUser);

    const result = await beforeLoad?.({
      location: { pathname: "/movies" },
      context: createContext(ensureQueryData),
    } as never);

    expect(result).toEqual({ user: memberUser });
  });
});
