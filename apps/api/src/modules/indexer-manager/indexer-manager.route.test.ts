import { beforeEach, describe, expect, it, vi } from "vitest";

import { indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
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
  authGuard: createAuthGuardMock(fakeUser),
}));
vi.mock("@/modules/auth/role.guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/role.guard")>();
  return {
    ...actual,
    requireRole: () => async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  };
});

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

const fakeManifest = {
  id: "com.test.addon",
  version: "1.0.0",
  name: "Test Addon",
  description: "A test addon",
  catalogs: [],
  resources: [],
  types: ["movie"],
};

const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn((input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/manifest.json")) {
      return Promise.resolve(new Response(JSON.stringify(fakeManifest), { status: 200 }));
    }
    return originalFetch(input);
  }) as typeof fetch;
});

const { indexerManagerRoutes } = await import("./indexer-manager.route");

describe("Indexer Manager Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
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
    it("returns 404 for unknown id", async () => {
      const res = await indexerManagerRoutes.request("/unknown-id");
      expect(res.status).toBe(404);
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
    it("creates a jackett config (SELF_HOSTED)", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", {
            type: "SELF_HOSTED",
            indexerType: "jackett",
            indexerUrl: "http://localhost:9117",
            indexerApiKey: "key",
          }),
        ),
      );
      expect(body).toMatchObject({ indexerType: "jackett" });
      expect(body.indexers).toBeDefined();
    });

    it("creates a stremio config via STREMIO_ADDON", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { type: "STREMIO_ADDON", manifestUrl: "https://torrentio.strem.fun/manifest.json" }),
        ),
      );
      expect(body).toMatchObject({
        indexerType: "stremio",
        indexerUrl: "https://torrentio.strem.fun",
      });
      expect(body.manifest).toMatchObject({ name: "Test Addon" });
    });

    it("creates a stremio config via PRESET", async () => {
      const body = await bodyOf(
        await indexerManagerRoutes.request("/", json("POST", { type: "PRESET", preset: "torrentio" })),
      );
      expect(body).toMatchObject({
        indexerType: "stremio",
        indexerUrl: "https://torrentio.strem.fun",
      });
      expect(body.manifest).toMatchObject({ name: "Test Addon" });
    });

    it("allows multiple jackett/prowlarr configs", async () => {
      await indexerManagerRoutes.request(
        "/",
        json("POST", { type: "SELF_HOSTED", indexerType: "jackett", indexerUrl: "http://one", indexerApiKey: "k1" }),
      );
      await indexerManagerRoutes.request(
        "/",
        json("POST", { type: "SELF_HOSTED", indexerType: "prowlarr", indexerUrl: "http://two", indexerApiKey: "k2" }),
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
          json("POST", {
            type: "SELF_HOSTED",
            indexerType: "jackett",
            indexerUrl: "http://old",
            indexerApiKey: "old",
          }),
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

    it("updates stremio manifest URL", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", { type: "STREMIO_ADDON", manifestUrl: "https://torrentio.strem.fun/manifest.json" }),
        ),
      );

      const updated = await bodyOf(
        await indexerManagerRoutes.request(
          `/${created.id}`,
          json("PATCH", { manifestUrl: "https://comet.elfhosted.com/manifest.json" }),
        ),
      );
      expect(updated.indexerUrl).toBe("https://comet.elfhosted.com");
    });

    it("updates disabled field", async () => {
      const created = await bodyOf(
        await indexerManagerRoutes.request(
          "/",
          json("POST", {
            type: "SELF_HOSTED",
            indexerType: "jackett",
            indexerUrl: "http://x",
            indexerApiKey: "k",
          }),
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
          json("POST", {
            type: "SELF_HOSTED",
            indexerType: "jackett",
            indexerUrl: "http://x",
            indexerApiKey: "x",
          }),
        ),
      );
      const body = await bodyOf(await indexerManagerRoutes.request(`/${created.id}`, { method: "DELETE" }));
      expect(body.success).toBe(true);

      const list = await bodyOf(await indexerManagerRoutes.request("/"));
      expect(list).toHaveLength(0);
    });
  });
});
