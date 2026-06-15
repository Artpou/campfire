import { beforeEach, describe, expect, it, vi } from "vitest";

import { indexer, indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
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
vi.mock("@/modules/download/webtorrent.client", () => ({
  torrentClient: { getClient: () => ({ add: vi.fn() }), getActiveTorrent: vi.fn(() => null) },
}));
vi.mock("./adapters/jackett.adapter", () => ({
  JackettAdapter: class {
    getIndexers = vi.fn(async () => [
      { id: "idx-1", name: "1337x", label: "1337x", privacy: "public" },
      { id: "idx-2", name: "RARBG", label: "RARBG", privacy: "public" },
    ]);
    search = vi.fn(async () => [
      { title: "Movie.2024.1080p", magnetUri: "magnet:?xt=abc", size: 2_000_000_000, seeders: 50 },
    ]);
  },
}));
vi.mock("./adapters/prowlarr.adapter", () => ({
  ProwlarrAdapter: class {
    getIndexers = vi.fn(async () => []);
    search = vi.fn(async () => []);
  },
}));
vi.mock("./adapters/torrentio.adapter", () => ({
  TorrentioAdapter: class {
    getIndexers = vi.fn(async () => [{ id: "torrentio", name: "torrentio", label: "Torrentio", privacy: "public" }]);
    search = vi.fn(async () => [
      {
        title: "Movie.2024.4K",
        tracker: "YTS",
        size: 5_000_000_000,
        seeders: 100,
        peers: 0,
        link: "magnet:?xt=urn:btih:abc123",
        guid: "abc123",
        quality: "4K",
        indexerType: "torrentio",
        publishDate: new Date().toISOString(),
      },
    ]);
  },
}));

const { torrentRoutes } = await import("./torrent.route");

const testMedia = {
  id: 1,
  type: "movie" as const,
  title: "Interstellar",
  original_title: null,
  sanitize_title: null,
  original_language: null,
  overview: null,
  poster_path: null,
  vote_average: null,
  release_date: null,
  duration: null,
  seasons_number: null,
  backdrop_path: null,
  categories: null,
};

describe("Torrent Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: fakeUser.id, username: fakeUser.username, password: "x", role: "member", createdAt: new Date() })
      .run();
  });

  describe("GET /indexers", () => {
    it("returns 400 when no indexer configured", async () => {
      expect((await torrentRoutes.request("/indexers")).status).toBe(400);
    });

    it("returns indexers from jackett manager", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();
      const body = await bodyOf(await torrentRoutes.request("/indexers"));
      expect(body).toHaveLength(2);
      expect(body[0].name).toBe("1337x");
      expect(body[0].indexerManagerId).toBe("c1");
      expect(body[0].indexerManagerType).toBe("jackett");
    });

    it("returns torrentio indexers from DB", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c2", indexerType: "torrentio", indexerUrl: "https://torrentio.strem.fun", indexerApiKey: "" })
        .run();
      testDbRef.current
        ?.insert(indexer)
        .values([
          { id: "i1", indexerManagerId: "c2", name: "yts", label: "YTS", privacy: "public" },
          { id: "i2", indexerManagerId: "c2", name: "1337x", label: "1337x", privacy: "public" },
        ])
        .run();

      const body = await bodyOf(await torrentRoutes.request("/indexers"));
      expect(body).toHaveLength(2);
      expect(body.map((i: { name: string }) => i.name).sort()).toEqual(["1337x", "yts"]);
    });

    it("aggregates indexers from multiple managers", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values([
          { id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" },
          { id: "c2", indexerType: "torrentio", indexerUrl: "https://torrentio.strem.fun", indexerApiKey: "" },
        ])
        .run();
      testDbRef.current
        ?.insert(indexer)
        .values({ id: "i1", indexerManagerId: "c2", name: "yts", label: "YTS", privacy: "public" })
        .run();

      const body = await bodyOf(await torrentRoutes.request("/indexers"));
      expect(body).toHaveLength(3);
    });

    it("excludes disabled managers", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k", disabled: true })
        .run();

      expect((await torrentRoutes.request("/indexers")).status).toBe(400);
    });
  });

  describe("POST /search", () => {
    it("returns 400 when manager not found", async () => {
      const res = await torrentRoutes.request(
        "/search",
        json("POST", { media: testMedia, indexerManagerId: "nonexistent" }),
      );
      expect(res.status).toBe(400);
    });

    it("returns search results for jackett", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();
      const body = await bodyOf(
        await torrentRoutes.request(
          "/search",
          json("POST", { media: testMedia, indexerManagerId: "c1", indexerId: "idx-1" }),
        ),
      );
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Movie.2024.1080p");
    });

    it("returns search results for torrentio", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c2", indexerType: "torrentio", indexerUrl: "https://torrentio.strem.fun", indexerApiKey: "" })
        .run();
      testDbRef.current
        ?.insert(indexer)
        .values({ id: "i1", indexerManagerId: "c2", name: "yts", label: "YTS", privacy: "public" })
        .run();

      const body = await bodyOf(
        await torrentRoutes.request(
          "/search",
          json("POST", { media: testMedia, indexerManagerId: "c2", imdbId: "tt0816692" }),
        ),
      );
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Movie.2024.4K");
    });

    it("rejects search on disabled manager", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k", disabled: true })
        .run();
      const res = await torrentRoutes.request("/search", json("POST", { media: testMedia, indexerManagerId: "c1" }));
      expect(res.status).toBe(400);
    });
  });
});
