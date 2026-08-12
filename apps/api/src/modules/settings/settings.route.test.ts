import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";
import { settings } from "./settings.schema";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = {
    id: "user-1",
    username: "admin",
    role: "admin" as "admin" | "owner" | "member" | "viewer",
    createdAt: new Date("2024-01-01"),
  };
  const testDbRef = { current: null as TestDb | null };
  return { fakeUser, testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));
vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(fakeUser),
}));

const { settingsRoutes } = await import("./settings.route");

describe("Settings Routes", () => {
  beforeEach(() => {
    fakeUser.role = "admin";
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
  });

  describe("GET /tmdb-key-status", () => {
    it("returns configured=false when no key saved", async () => {
      const body = await bodyOf(await settingsRoutes.request("/tmdb-key-status"));
      expect(body).toEqual({ configured: false });
    });

    it("returns configured=true when a key is stored", async () => {
      testDbRef.current
        ?.insert(settings)
        .values({ id: "default", tmdbApiKey: "abcd1234efgh", showMediaRatings: true, updatedAt: new Date() })
        .run();

      const body = await bodyOf(await settingsRoutes.request("/tmdb-key-status"));
      expect(body).toEqual({ configured: true });
    });
  });

  describe("GET /ui", () => {
    it("returns showMediaRatings default when empty", async () => {
      const body = await bodyOf(await settingsRoutes.request("/ui"));
      expect(body).toEqual({ showMediaRatings: false });
    });

    it("returns stored UI flags", async () => {
      testDbRef.current
        ?.insert(settings)
        .values({ id: "default", tmdbApiKey: null, showMediaRatings: true, updatedAt: new Date() })
        .run();

      const body = await bodyOf(await settingsRoutes.request("/ui"));
      expect(body).toEqual({ showMediaRatings: true });
    });
  });

  describe("GET / (admin)", () => {
    it("returns masked settings for admin", async () => {
      testDbRef.current
        ?.insert(settings)
        .values({ id: "default", tmdbApiKey: "supersecretkey99", showMediaRatings: false, updatedAt: new Date() })
        .run();

      const body = await bodyOf(await settingsRoutes.request("/"));
      expect(body.tmdbApiKey).toBe("****ey99");
      expect(body.showMediaRatings).toBe(false);
    });

    it("returns 403 for members", async () => {
      fakeUser.role = "member";
      expect((await settingsRoutes.request("/")).status).toBe(403);
    });
  });

  describe("PUT / (admin)", () => {
    it("creates settings with a TMDB key", async () => {
      const body = await bodyOf(await settingsRoutes.request("/", json("PUT", { tmdbApiKey: "new-tmdb-key-1234" })));
      expect(body.tmdbApiKey).toMatch(/^\*\*\*\*/);
      expect(body.showMediaRatings).toBe(false);
    });

    it("updates existing settings", async () => {
      testDbRef.current
        ?.insert(settings)
        .values({ id: "default", tmdbApiKey: "oldkeyxxxx", showMediaRatings: false, updatedAt: new Date() })
        .run();

      const body = await bodyOf(await settingsRoutes.request("/", json("PUT", { tmdbApiKey: "brandnewkey9999" })));
      expect(body.tmdbApiKey).toBe("****9999");
    });

    it("forbids admin from changing showMediaRatings", async () => {
      const res = await settingsRoutes.request("/", json("PUT", { showMediaRatings: true }));
      expect(res.status).toBe(403);
    });

    it("allows owner to change showMediaRatings", async () => {
      fakeUser.role = "owner";
      const body = await bodyOf(await settingsRoutes.request("/", json("PUT", { showMediaRatings: true })));
      expect(body.showMediaRatings).toBe(true);
    });
  });
});
