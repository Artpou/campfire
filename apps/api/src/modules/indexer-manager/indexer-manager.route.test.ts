import { beforeEach, describe, expect, it, vi } from "vitest";

import { indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import { user } from "@/modules/user/user.schema";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  return { fakeUser, testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));
vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: async (c: unknown, next: () => Promise<void>) => {
    (c as { set: (k: string, v: unknown) => void }).set("user", fakeUser);
    await next();
  },
}));
vi.mock("@/modules/auth/role.guard", () => ({
  requireRole: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

const { indexerManagerRoutes } = await import("./indexer-manager.route");

describe("Indexer Manager Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: fakeUser.id, username: fakeUser.username, password: "x", role: "member", createdAt: new Date() })
      .run();
  });

  describe("GET /", () => {
    it("returns null when no config", async () => {
      const res = await indexerManagerRoutes.request("/");
      expect(res.status).toBe(200);
    });

    it("returns existing config", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "idx-1", indexerType: "prowlarr", indexerUrl: "http://localhost:9696", indexerApiKey: "key" })
        .run();

      const body = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(body).toMatchObject({ indexerType: "prowlarr", indexerUrl: "http://localhost:9696" });
    });
  });

  describe("POST / - upsert", () => {
    it("creates config", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "jackett", indexerUrl: "http://localhost:9117", indexerApiKey: "key" }),
        ),
      );
      expect(body).toMatchObject({ indexerType: "jackett" });
    });

    it("updates existing config", async () => {
      await indexerManagerRoutes.request(
        "/",
        json("POST", { indexerType: "jackett", indexerUrl: "http://old", indexerApiKey: "old" }),
      );
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "prowlarr", indexerUrl: "http://new", indexerApiKey: "new" }),
        ),
      );
      expect(body).toMatchObject({ indexerType: "prowlarr", indexerApiKey: "new" });
    });
  });

  describe("DELETE /", () => {
    it("deletes config and subsequent GET returns empty", async () => {
      await indexerManagerRoutes.request(
        "/",
        json("POST", { indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "x" }),
      );
      const body = await bodyOf(await indexerManagerRoutes.request("/", { method: "DELETE" }));
      expect(body.success).toBe(true);

      const text = await (await indexerManagerRoutes.request("/")).text();
      expect(text === "" || text === "null" || text === "undefined").toBe(true);
    });
  });
});
