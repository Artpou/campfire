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
vi.mock("@/modules/download/webtorrent.client", () => ({
  torrentClient: { getClient: () => ({ add: vi.fn() }), getActiveTorrent: vi.fn(() => null) },
}));
vi.mock("./adapters/jackett.adapter", () => ({
  JackettAdapter: class {
    getIndexers = vi.fn(async () => [
      { id: "idx-1", name: "1337x", configured: true },
      { id: "idx-2", name: "RARBG", configured: true },
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

    it("returns indexers when config exists", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();
      const body = await bodyOf(await torrentRoutes.request("/indexers"));
      expect(body).toHaveLength(2);
      expect(body[0].name).toBe("1337x");
    });
  });

  describe("POST /search", () => {
    it("returns 400 when no indexer configured", async () => {
      expect(
        (await torrentRoutes.request("/search", json("POST", { media: testMedia, indexerId: "idx-1" }))).status,
      ).toBe(400);
    });

    it("returns search results", async () => {
      testDbRef.current
        ?.insert(indexerManager)
        .values({ id: "c1", indexerType: "jackett", indexerUrl: "http://x", indexerApiKey: "k" })
        .run();
      const body = await bodyOf(
        await torrentRoutes.request("/search", json("POST", { media: testMedia, indexerId: "idx-1" })),
      );
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Movie.2024.1080p");
    });
  });
});
