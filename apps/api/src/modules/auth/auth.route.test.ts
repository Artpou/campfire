import { beforeEach, describe, expect, it, vi } from "vitest";

import { user } from "@/modules/user/user.schema";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { testDbRef } = vi.hoisted(() => {
  const testDbRef = { current: null as TestDb | null };
  return { testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));

const { authRoutes } = await import("./auth.route");

describe("Auth Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
  });

  describe("GET /has-owner", () => {
    it("returns false when no users exist", async () => {
      const body = await bodyOf(await authRoutes.request("/has-owner"));
      expect(body.hasOwner).toBe(false);
    });

    it("returns true when owner exists", async () => {
      testDbRef.current
        ?.insert(user)
        .values({ id: "o1", username: "owner", password: "x", role: "owner", createdAt: new Date() })
        .run();
      const body = await bodyOf(await authRoutes.request("/has-owner"));
      expect(body.hasOwner).toBe(true);
    });
  });

  describe("POST /register", () => {
    it("creates the first owner", async () => {
      const body = await bodyOf(
        await authRoutes.request("/register", json("POST", { username: "first", password: "password123" })),
      );
      expect(body).toMatchObject({ username: "first", role: "owner" });
    });

    it("returns 403 when owner already exists", async () => {
      testDbRef.current
        ?.insert(user)
        .values({ id: "o1", username: "existing", password: "x", role: "owner", createdAt: new Date() })
        .run();
      expect(
        (await authRoutes.request("/register", json("POST", { username: "new", password: "password123" }))).status,
      ).toBe(403);
    });
  });

  describe("POST /login", () => {
    it("returns 401 on invalid credentials", async () => {
      expect((await authRoutes.request("/login", json("POST", { username: "nobody", password: "wrong" }))).status).toBe(
        401,
      );
    });
  });

  describe("POST /logout", () => {
    it("returns success", async () => {
      const body = await bodyOf(await authRoutes.request("/logout", { method: "POST" }));
      expect(body.success).toBe(true);
    });
  });

  describe("GET /me", () => {
    it("returns 401 without session", async () => {
      expect((await authRoutes.request("/me")).status).toBe(401);
    });
  });
});
