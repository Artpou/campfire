import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TorrentLiveData } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";
import { Readable } from "node:stream";

const { fakeUser, testDbRef, mockGetStreamForDownload } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  const mockGetStreamForDownload = vi.fn();
  return { fakeUser, testDbRef, mockGetStreamForDownload };
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
  authGuard: createAuthGuardMock(fakeUser),
}));
vi.mock("@/helpers/video.helper", () => ({
  getVideoInputFormat: vi.fn(() => "matroska"),
  shouldTranscodeForPlayback: vi.fn(() => false),
  convertToFragmentedMp4Stream: vi.fn((input: Readable) => ({ stream: input, destroy: vi.fn() })),
}));
vi.mock("@/modules/download/download-stream.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./download-stream.service")>();
  return {
    DownloadStreamService: class extends actual.DownloadStreamService {
      getStreamForDownload = mockGetStreamForDownload;
    },
  };
});
vi.mock("@/modules/storage-config/remote-storage.service", () => ({
  remoteStorageService: {
    shouldDeleteLocalAfterTransfer: vi.fn().mockResolvedValue(false),
    isEnabled: vi.fn().mockResolvedValue(false),
    isAvailable: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(undefined),
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
      resolveTorrent: vi.fn(() => null),
      attachTorrent: vi.fn(async () => makeFakeTorrent()),
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
    seedTestUser(testDbRef.current, fakeUser);
    mockGetStreamForDownload.mockReset();
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
      expect(body).toHaveLength(2);
      expect(body.map((d: { id: string }) => d.id).sort()).toEqual(["dl-mine", "dl-theirs"]);
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

  describe("GET /:id/stream", () => {
    it("returns 404 when no video file is available", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-stream",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "NoVideo", done: true }),
          createdAt: new Date(),
        })
        .run();

      mockGetStreamForDownload.mockResolvedValue(undefined);

      expect((await downloadRoutes.request("/dl-stream/stream")).status).toBe(404);
    });

    it("streams video with content-type header", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-stream",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Movie.mp4", done: true }),
          createdAt: new Date(),
        })
        .run();

      mockGetStreamForDownload.mockResolvedValue({
        stream: Readable.from(Buffer.from("fake-video")),
        size: 10,
        fileName: "Movie.mp4",
      });

      const res = await downloadRoutes.request("/dl-stream/stream");
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("video/mp4");
      expect(res.headers.get("accept-ranges")).toBe("bytes");
      await expect(res.text()).resolves.toBe("fake-video");
    });

    it("uses webtorrent for range requests on active mp4 downloads", async () => {
      const mockCreateReadStream = vi.fn(() => Readable.from(Buffer.from("range-chunk")));

      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-stream-range",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Movie.mp4", done: false }),
          createdAt: new Date(),
        })
        .run();

      mockGetStreamForDownload.mockResolvedValue({
        stream: Readable.from(Buffer.from("fake-video")),
        size: 1000,
        fileName: "Movie.mp4",
        torrentFile: { createReadStream: mockCreateReadStream },
      });

      const res = await downloadRoutes.request("/dl-stream-range/stream", {
        headers: { Range: "bytes=0-99" },
      });
      expect(res.status).toBe(206);
      expect(mockCreateReadStream).toHaveBeenCalledWith({ start: 0, end: 99 });
      await expect(res.text()).resolves.toBe("range-chunk");
    });

    it("serves active mkv torrent streams with byte ranges (no ffmpeg remux)", async () => {
      const mockCreateReadStream = vi.fn(() => Readable.from(Buffer.from("torrent-chunk")));

      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-stream-mkv",
          userId: fakeUser.id,
          torrent: sampleTorrent({ name: "Movie.mkv", done: false }),
          createdAt: new Date(),
        })
        .run();

      mockGetStreamForDownload.mockResolvedValue({
        stream: Readable.from(Buffer.from("fake-video")),
        size: 1000,
        fileName: "Movie.mkv",
        torrentFile: { createReadStream: mockCreateReadStream },
      });

      const res = await downloadRoutes.request("/dl-stream-mkv/stream", {
        headers: { Range: "bytes=0-99" },
      });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-type")).toBe("video/x-matroska");
      expect(mockCreateReadStream).toHaveBeenCalledWith({ start: 0, end: 99 });
    });
  });
});
