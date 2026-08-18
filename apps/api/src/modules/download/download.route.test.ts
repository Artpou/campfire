import { beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, sampleTorrent, type TestDb } from "@/tests/test.helper";

process.env.STORAGE_ENCRYPTION_KEY = "test-storage-encryption-key";

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
vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: {
    shouldDeleteLocalAfterTransfer: vi.fn().mockResolvedValue(false),
    isEnabled: vi.fn().mockResolvedValue(false),
    isAvailable: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("@/modules/download/webtorrent/webtorrent-manager", () => {
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
      downloadPath: "./downloads",
      getClient: () => ({ torrents: [], add: vi.fn(() => makeFakeTorrent()) }),
      getActiveTorrent: vi.fn(() => null),
      deleteActiveTorrent: vi.fn(),
      setActiveTorrent: vi.fn(),
      markDestroying: vi.fn(),
      unmarkDestroying: vi.fn(),
      isDestroying: vi.fn(() => false),
      findByInfoHash: vi.fn(() => null),
      resolveTorrent: vi.fn(() => null),
      attachTorrent: vi.fn(async () => makeFakeTorrent()),
      safeAdd: vi.fn(() => makeFakeTorrent()),
    },
  };
});
vi.mock("@/modules/download/webtorrent-sync", () => ({
  setupTorrentHandlers: vi.fn(),
  restoreActiveTorrents: vi.fn(),
  clearHandlersForDownload: vi.fn(),
}));

const { downloadRoutes } = await import("./download.route");
const { localFileRoutes } = await import("./local/local-file.route");

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
    seedTestUser(testDbRef.current, fakeUser);
  });

  describe("GET / - list downloads", () => {
    it("returns empty paginated list", async () => {
      expect(await bodyOf(await downloadRoutes.request("/"))).toEqual({
        results: [],
        page: 1,
        hasMore: false,
      });
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
      expect(body.results).toHaveLength(1);
      expect(body.results[0].torrent.name).toBe("Test");
      expect(body.page).toBe(1);
      expect(body.hasMore).toBe(false);
    });

    it("returns downloads from all users for members", async () => {
      const db = testDbRef.current;
      if (!db) throw new Error("test db not initialized");
      seedTestUser(db, {
        id: "user-2",
        username: "other",
        role: "member",
        createdAt: new Date("2024-01-02"),
      });
      db.insert(download)
        .values([
          {
            id: "dl-mine",
            userId: fakeUser.id,
            torrent: sampleTorrent({ name: "Mine" }),
            createdAt: new Date(),
          },
          {
            id: "dl-theirs",
            userId: "user-2",
            torrent: sampleTorrent({ name: "Theirs" }),
            createdAt: new Date(),
          },
        ])
        .run();

      const body = await bodyOf(await downloadRoutes.request("/"));
      expect(body.results).toHaveLength(2);
      expect(body.results.map((d: { id: string }) => d.id).sort()).toEqual(["dl-mine", "dl-theirs"]);
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

  describe("POST /:id/fileToken + GET /download-files/:id", () => {
    it("issues a short-lived file token", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-file",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Movie", done: true }),
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/dl-file/fileToken", { method: "POST" }));
      expect(body.token).toEqual(expect.any(String));
      expect(body.token.split(".")).toHaveLength(2);
    });

    it("rejects file download without a valid token", async () => {
      const res = await localFileRoutes.request("/dl-file?token=invalid");
      expect(res.status).toBe(401);
    });

    it("rejects file download when token downloadId does not match", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-a",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "A", done: true }),
          createdAt: new Date(),
        })
        .run();

      const { token } = await bodyOf(await downloadRoutes.request("/dl-a/fileToken", { method: "POST" }));
      const res = await localFileRoutes.request(`/dl-b?token=${encodeURIComponent(token)}`);
      expect(res.status).toBe(401);
    });
  });
});
