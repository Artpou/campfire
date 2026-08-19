import { beforeEach, describe, expect, it, vi } from "vitest";

import { user } from "@/modules/user/user.schema";
import { createAuthGuardMock } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { adminUser, testDbRef } = vi.hoisted(() => {
  const adminUser = { id: "user-admin", username: "admin", role: "admin" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  return { adminUser, testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));
vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(adminUser),
}));

const { userRoutes } = await import("./user.route");

describe("User Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values([
        { id: "user-admin", username: "admin", password: "hashed", role: "admin", createdAt: new Date() },
        { id: "user-owner", username: "owner", password: "hashed", role: "owner", createdAt: new Date() },
        { id: "user-member", username: "member1", password: "hashed", role: "member", createdAt: new Date() },
      ])
      .run();
  });

  describe("GET /:id", () => {
    it("returns existing user without password", async () => {
      const body = await bodyOf(await userRoutes.request("/user-member"));
      expect(body).toMatchObject({ username: "member1", role: "member" });
      expect(body).not.toHaveProperty("password");
    });

    it("returns 404 for unknown user", async () => {
      expect((await userRoutes.request("/nope")).status).toBe(404);
    });
  });

  describe("GET / - list users", () => {
    it("returns all users", async () => {
      const body = await bodyOf(await userRoutes.request("/"));
      expect(body).toHaveLength(3);
    });

    it("filters users by search", async () => {
      const body = await bodyOf(await userRoutes.request("/?q=member"));
      expect(body).toHaveLength(1);
      expect(body[0].username).toBe("member1");
    });
  });

  describe("POST / - create user", () => {
    it("creates a member", async () => {
      const body = await bodyOf(
        await userRoutes.request("/", json("POST", { username: "newuser", password: "password123", role: "member" })),
      );
      expect(body).toMatchObject({ username: "newuser", role: "member" });
    });

    it("returns 403 when admin creates owner", async () => {
      expect(
        (await userRoutes.request("/", json("POST", { username: "newowner", password: "password123", role: "owner" })))
          .status,
      ).toBe(403);
    });

    it("returns 409 on duplicate username", async () => {
      expect(
        (await userRoutes.request("/", json("POST", { username: "member1", password: "password123", role: "member" })))
          .status,
      ).toBe(409);
    });
  });

  describe("PUT /:id - update user", () => {
    it("updates username", async () => {
      const body = await bodyOf(await userRoutes.request("/user-member", json("PUT", { username: "renamed" })));
      expect(body.username).toBe("renamed");
    });

    it("returns 403 when modifying owner", async () => {
      expect((await userRoutes.request("/user-owner", json("PUT", { username: "hacked" }))).status).toBe(403);
    });
  });

  describe("DELETE /:id", () => {
    it("deletes a member", async () => {
      const body = await bodyOf(await userRoutes.request("/user-member", { method: "DELETE" }));
      expect(body.success).toBe(true);
    });

    it("returns 403 when deleting owner", async () => {
      expect((await userRoutes.request("/user-owner", { method: "DELETE" })).status).toBe(403);
    });
  });

  describe("POST /me/onboarded", () => {
    it("marks the current user as onboarded", async () => {
      const body = await bodyOf(await userRoutes.request("/me/onboarded", { method: "POST" }));
      expect(body).toMatchObject({ id: "user-admin", onboarded: true });
    });
  });
});
