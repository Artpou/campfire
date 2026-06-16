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

vi.mock("@/modules/torrent/adapters/prowlarr.adapter", () => ({
  ProwlarrAdapter: class {
    async getIndexers() {
      return [{ id: "1", name: "test-prowlarr", label: "Test Prowlarr", privacy: "public" as const }];
    }
  },
}));
vi.mock("@/modules/torrent/adapters/jackett.adapter", () => ({
  JackettAdapter: class {
    async getIndexers() {
      return [{ id: "1", name: "test-jackett", label: "Test Jackett", privacy: "public" as const }];
    }
  },
}));
vi.mock("@/modules/torrent/adapters/stremio.adapter", () => ({
  StremioAdapter: class {
    async getIndexers() {
      return [];
    }
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
    it("returns empty array when no config", async () => {
      const body = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(body).toEqual([]);
    });

    it("returns all configs with indexers", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "idx-1", indexerType: "prowlarr", indexerUrl: "http://localhost:9696", indexerApiKey: "key" })
        .run();

      const body = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(body).toHaveLength(1);
      expect(body[0]).toMatchObject({ indexerType: "prowlarr", indexerUrl: "http://localhost:9696" });
      expect(body[0].indexers).toBeDefined();
      expect(Array.isArray(body[0].indexers)).toBe(true);
    });
  });

  describe("GET /:id", () => {
    it("returns null for unknown id", async () => {
      const body = await bodyOf(await indexerManagerRoutes.request("/unknown-id"));
      expect(body).toBeNull();
    });

    it("returns config by id with indexers", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "idx-1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();

      const body = await bodyOf(await indexerManagerRoutes.request("/idx-1"));
      expect(body).toMatchObject({ id: "idx-1", indexerType: "jackett" });
      expect(body.indexers).toBeDefined();
    });
  });

  describe("POST /", () => {
    it("creates a jackett config", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "jackett", indexerUrl: "http://localhost:9117", indexerApiKey: "key" }),
        ),
      );
      expect(body).toMatchObject({ indexerType: "jackett" });
      expect(body.indexers).toBeDefined();
    });

    it("creates a stremio config with provider URL", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request("/", json("POST", { indexerType: "stremio", providers: ["yts", "1337x"] })),
      );
      expect(body).toMatchObject({
        indexerType: "stremio",
        indexerUrl: "https://torrentio.strem.fun/yts,1337x",
      });
      expect(body.indexers).toEqual([]);
    });

    it("allows multiple jackett/prowlarr configs", async () => {
      await indexerManagerRoutes.request(
        "/",
        json("POST", { indexerType: "jackett", indexerUrl: "http://one", indexerApiKey: "k1" }),
      );
      await indexerManagerRoutes.request(
        "/",
        json("POST", { indexerType: "prowlarr", indexerUrl: "http://two", indexerApiKey: "k2" }),
      );
      const body = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(body).toHaveLength(2);
    });
  });

  describe("PATCH /:id", () => {
    it("updates an existing jackett config", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "jackett", indexerUrl: "http://old", indexerApiKey: "old" }),
        ),
      );
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          `/${created.id}`,
          json("PATCH", { indexerUrl: "http://new", indexerApiKey: "new" }),
        ),
      );
      expect(body).toMatchObject({ indexerUrl: "http://new", indexerApiKey: "new" });
    });

    it("updates stremio providers", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request("/", json("POST", { indexerType: "stremio", providers: ["yts", "1337x"] })),
      );

      const updated = await bodyOf(
        await indexerManagerRoutes.request(`/${created.id}`, json("PATCH", { providers: ["yts", "rutor"] })),
      );
      expect(updated.indexerUrl).toBe("https://torrentio.strem.fun/yts,rutor");
    });

    it("updates disabled field", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" }),
        ),
      );
      expect(created.disabled).toBe(false);

      const updated = await bodyOf(
        await indexerManagerRoutes.request(`/${created.id}`, json("PATCH", { disabled: true })),
      );
      expect(updated.disabled).toBe(true);
      expect(updated.indexers).toEqual([]);
    });
  });

  describe("DELETE /:id", () => {
    it("deletes config by id", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "x" }),
        ),
      );
      const body = await bodyOf(await indexerManagerRoutes.request(`/${created.id}`, { method: "DELETE" }));
      expect(body.success).toBe(true);

      const list = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(list).toHaveLength(0);
    });
  });
});
