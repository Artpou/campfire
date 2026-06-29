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
vi.mock("@/modules/download/webtorrent.client", () => ({
  torrentClient: { getClient: () => ({ add: vi.fn() }), getActiveTorrent: vi.fn(() => null) },
}));
vi.mock("./adapters/jackett.adapter", () => ({
  JackettAdapter: class {
    getIndexers = vi.fn(async () => []);
    getTorrents = vi.fn(async () => [
      {
        title: "Movie.2024.1080p",
        tracker: "1337x",
        size: 2_000_000_000,
        publishDate: new Date().toISOString(),
        seeders: 50,
        peers: 10,
        link: "magnet:?xt=abc",
        guid: "abc",
        quality: "1080p",
        indexerType: "jackett",
      },
    ]);
  },
}));
vi.mock("./adapters/prowlarr.adapter", () => ({
  ProwlarrAdapter: class {
    getTorrents = vi.fn(async () => []);
  },
}));
vi.mock("./adapters/stremio.adapter", () => ({
  StremioAdapter: class {
    getIndexers = vi.fn(async () => []);
    getTorrents = vi.fn(async () => [
      {
        title: "Movie.2024.4K",
        tracker: "YTS",
        size: 5_000_000_000,
        publishDate: new Date().toISOString(),
        seeders: 100,
        peers: 0,
        link: "magnet:?xt=urn:btih:abc123",
        guid: "abc123",
        quality: "4K",
        indexerType: "stremio",
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
  imdbId: "tt0816692",
};

describe("Torrent Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
  });

  describe("POST /list", () => {
    it("returns 404 when manager not found", async () => {
      const res = await torrentRoutes.request(
        "/list",
        json("POST", { media: testMedia, indexerManagerId: "nonexistent" }),
      );
      expect(res.status).toBe(404);
    });

    it("returns search results for jackett", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();
      const body = await bodyOf(
        await torrentRoutes.request(
          "/list",
          json("POST", { media: testMedia, indexerManagerId: "c1", indexerId: "idx-1" }),
        ),
      );
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Movie.2024.1080p");
    });

    it("returns search results for stremio", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({
          id: "c2",
          indexerType: "stremio",
          indexerUrl: "https://torrentio.strem.fun/yts",
          indexerApiKey: "",
        })
        .run();

      const body = await bodyOf(
        await torrentRoutes.request("/list", json("POST", { media: testMedia, indexerManagerId: "c2" })),
      );
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Movie.2024.4K");
    });

    it("rejects search on disabled manager", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k", disabled: true })
        .run();
      const res = await torrentRoutes.request("/list", json("POST", { media: testMedia, indexerManagerId: "c1" }));
      expect(res.status).toBe(400);
    });
  });
});
