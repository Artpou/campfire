import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TorrentLiveData } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import { user } from "@/modules/user/user.schema";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  return { fakeUser, testDbRef };
});

const sampleTorrent = (overrides: Partial<TorrentLiveData> = {}): TorrentLiveData =>
  ({
    infoHash: "abc",
    magnetURI: "magnet:?xt=urn:btih:abc",
    announce: [],
    "announce-list": [],
    timeRemaining: 0,
    received: 0,
    downloaded: 0,
    uploaded: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0.5,
    ratio: 0,
    length: 1000,
    pieceLength: 524288,
    lastPieceLength: 0,
    numPeers: 0,
    path: "./downloads",
    ready: true,
    paused: false,
    done: false,
    name: "Test",
    created: new Date(),
    maxWebConns: 4,
    files: [],
    ...overrides,
  }) as TorrentLiveData;

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
vi.mock("@/modules/download/webtorrent.client", () => {
  const makeFakeTorrent = () => ({
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "ready") setTimeout(() => cb(), 0);
    }),
    destroy: vi.fn((_opts?: unknown, cb?: () => void) => cb?.()),
    infoHash: "fakehash",
    magnetURI: "magnet:?xt=urn:btih:fake",
    torrentFileBlobURL: undefined,
    announce: [],
    "announce-list": [],
    timeRemaining: 0,
    received: 0,
    downloaded: 0,
    uploaded: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0,
    ratio: 0,
    length: 1000,
    pieceLength: 524288,
    lastPieceLength: 0,
    numPeers: 0,
    path: "/tmp",
    ready: true,
    paused: false,
    done: false,
    name: "FakeTorrent",
    created: new Date(),
    createdBy: undefined,
    comment: undefined,
    maxWebConns: 4,
    files: [],
  });

  return {
    torrentClient: {
      getClient: () => ({ add: vi.fn(() => makeFakeTorrent()) }),
      getActiveTorrent: vi.fn(() => null),
      getPausedData: vi.fn(() => undefined),
      deleteActiveTorrent: vi.fn(),
      setPausedData: vi.fn(),
      clearPausedData: vi.fn(),
      setActiveTorrent: vi.fn(),
      setupTorrentHandlers: vi.fn(),
      markDestroying: vi.fn(),
      unmarkDestroying: vi.fn(),
      findByInfoHash: vi.fn(() => null),
      safeAdd: vi.fn(() => makeFakeTorrent()),
    },
  };
});

const { downloadRoutes } = await import("./download.route");

const testMedia = {
  id: 42,
  type: "movie" as const,
  title: "New Movie",
  imdbId: "tt12345678",
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

function startDownloadPayload(magnetUri: string, name: string) {
  return { magnetUri, name, media: testMedia };
}

describe("Download Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: fakeUser.id, username: fakeUser.username, password: "x", role: "member", createdAt: new Date() })
      .run();
  });

  describe("GET / - list downloads", () => {
    it("returns empty list", async () => {
      expect(await bodyOf(await downloadRoutes.request("/"))).toEqual([]);
    });

    it("returns downloads", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-1",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Test", paused: true }),
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/"));
      expect(body).toHaveLength(1);
      expect(body[0].torrent.name).toBe("Test");
    });
  });

  describe("GET /:id", () => {
    it("returns 404 for unknown", async () => {
      expect((await downloadRoutes.request("/nope")).status).toBe(404);
    });

    it("returns download details", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-1",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Movie", done: true }),
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/dl-1"));
      expect(body).toMatchObject({ id: "dl-1", torrent: { name: "Movie", done: true } });
    });
  });

  describe("POST / - start download", () => {
    it("creates a new download", async () => {
      const body = await bodyOf(
        await downloadRoutes.request("/", json("POST", startDownloadPayload("magnet:?xt=urn:btih:new", "New Movie"))),
      );
      expect(body).toMatchObject({
        torrent: { name: "FakeTorrent" },
        userId: fakeUser.id,
        mediaId: testMedia.id,
      });
    });

    it("creates a new download even if magnet already exists", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "existing",
          userId: fakeUser.id,
          mediaId: testMedia.id,
          torrent: sampleTorrent({ infoHash: "dup", magnetURI: "magnet:?xt=urn:btih:dup", name: "Dup", done: true }),
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(
        await downloadRoutes.request("/", json("POST", startDownloadPayload("magnet:?xt=urn:btih:dup", "Dup"))),
      );
      expect(body.id).not.toBe("existing");
      expect(body.torrent.name).toBe("FakeTorrent");
    });
  });

  describe("DELETE /:id", () => {
    it("deletes a download", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-del",
          userId: fakeUser.id,
          torrent: sampleTorrent({
            infoHash: "del",
            magnetURI: "magnet:?xt=urn:btih:del",
            name: "Del",
            done: true,
          }),
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/dl-del", { method: "DELETE" }));
      expect(body.success).toBe(true);
    });
  });
});
