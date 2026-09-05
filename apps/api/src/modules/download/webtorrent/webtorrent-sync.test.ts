process.env.SEED_AFTER_COMPLETE_MINUTES = "-1";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { mediaRequest } from "@/modules/request/request.schema";
import { createTestDb, sampleTorrent, seedTestUser, testDbRef } from "@/tests/test.helper";
import { EventEmitter } from "node:events";

const { isEnabled, isAutoTransferEnabled, markTransferStarting, runRemoteTransfer, invalidateStreamSource } =
  vi.hoisted(() => ({
    isEnabled: vi.fn(),
    isAutoTransferEnabled: vi.fn(),
    markTransferStarting: vi.fn(),
    runRemoteTransfer: vi.fn(),
    invalidateStreamSource: vi.fn(),
  }));

vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: { isEnabled, isAutoTransferEnabled },
}));

vi.mock("../remote/remote-transfer.helper", () => ({
  markTransferStarting,
  runRemoteTransfer,
}));

vi.mock("@/modules/streaming/streaming-cache.helper", () => ({
  invalidateStreamSource,
}));

vi.mock("@/modules/activity/activity.service", () => ({
  ActivityService: class {
    log = vi.fn();
  },
  activityFor: () => ({ log: vi.fn() }),
  trackRoute: async (_c: unknown, _input: unknown, fn: () => unknown) => fn(),
}));

vi.mock("@/shared/helpers/video.helper", () => ({
  probeVideoDuration: vi.fn().mockResolvedValue(undefined),
}));

const { setupTorrentHandlers, clearHandlersForDownload, restoreActiveTorrents, stopHealthCheck } = await import(
  "./webtorrent-sync"
);
const { torrentClient } = await import("./webtorrent-manager");

function createFakeTorrent(overrides: Record<string, unknown> = {}) {
  const torrent = new EventEmitter() as EventEmitter & Record<string, unknown>;
  Object.assign(torrent, {
    name: "Movie.mkv",
    ready: true,
    done: false,
    paused: false,
    infoHash: "abc123",
    magnetURI: "magnet:?xt=urn:btih:abc123",
    torrentFileBlobURL: undefined,
    announce: [],
    "announce-list": [],
    timeRemaining: 0,
    received: 0,
    downloaded: 50,
    uploaded: 0,
    downloadSpeed: 10,
    uploadSpeed: 0,
    progress: 0.5,
    ratio: 0,
    length: 100,
    pieceLength: 16,
    lastPieceLength: 0,
    numPeers: 1,
    path: "./downloads",
    created: new Date(),
    createdBy: undefined,
    comment: undefined,
    maxWebConns: 4,
    files: [
      {
        name: "Movie.mkv",
        path: "Movie.mkv",
        length: 100,
        downloaded: 50,
        progress: 0.5,
      },
    ],
    destroy: vi.fn(),
    ...overrides,
  });
  return torrent;
}

describe("webtorrent-sync", () => {
  const user = { id: "user-1", username: "u", role: "member" as const, createdAt: new Date() };

  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    clearHandlersForDownload("dl-1");
    torrentClient.deleteActiveTorrent("dl-1");
    torrentClient.unmarkDestroying("dl-1");
    isEnabled.mockReset().mockResolvedValue(false);
    isAutoTransferEnabled.mockReset().mockResolvedValue(false);
    markTransferStarting.mockReset().mockResolvedValue(undefined);
    runRemoteTransfer.mockReset().mockResolvedValue(undefined);
    invalidateStreamSource.mockReset();
    stopHealthCheck();
  });

  it("syncs torrent live data on ready", async () => {
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-1",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie.mkv", done: false, progress: 0 }),
        createdAt: new Date(),
      })
      .run();

    const torrent = createFakeTorrent({ ready: false });
    setupTorrentHandlers(torrent as never, "dl-1");
    torrent.ready = true;
    torrent.emit("ready");

    await vi.waitFor(async () => {
      const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-1") });
      expect(row?.torrent?.progress).toBe(0.5);
      expect(torrentClient.getActiveTorrent("dl-1")).toBe(torrent);
    });
  });

  it("marks download done, validates requests, and skips auto-transfer", async () => {
    testDbRef.current.insert(media).values({ id: 10, type: "movie", title: "Movie", imdbId: "tt10" }).run();
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-1",
        userId: user.id,
        mediaId: 10,
        torrent: sampleTorrent({ name: "Movie.mkv", done: false, progress: 0.9, skipAutoTransfer: true }),
        createdAt: new Date(),
      })
      .run();
    testDbRef.current
      .insert(mediaRequest)
      .values({ id: "req-1", userId: user.id, mediaId: 10, status: "pending", dismissed: false, createdAt: new Date() })
      .run();

    const torrent = createFakeTorrent({
      done: true,
      progress: 1,
      downloaded: 100,
      files: [{ name: "Movie.mkv", path: "Movie.mkv", length: 100, downloaded: 100, progress: 1 }],
    });
    setupTorrentHandlers(torrent as never, "dl-1");
    await new Promise<void>((resolve) => {
      torrent.emit("done");
      setTimeout(resolve, 20);
    });

    await vi.waitFor(async () => {
      const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-1") });
      expect(row?.torrent?.done).toBe(true);
      const req = await testDbRef.current.query.mediaRequest.findFirst({ where: eq(mediaRequest.id, "req-1") });
      expect(req?.status).toBe("validated");
      expect(invalidateStreamSource).toHaveBeenCalledWith("dl-1");
      expect(runRemoteTransfer).not.toHaveBeenCalled();
    });
  });

  it("starts auto remote transfer when enabled", async () => {
    isAutoTransferEnabled.mockResolvedValue(true);
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-1",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie.mkv", done: false, progress: 0.9 }),
        createdAt: new Date(),
      })
      .run();

    const torrent = createFakeTorrent({ done: true, progress: 1, downloaded: 100 });
    setupTorrentHandlers(torrent as never, "dl-1");
    torrent.emit("done");

    await vi.waitFor(() => {
      expect(markTransferStarting).toHaveBeenCalledWith("dl-1");
      expect(runRemoteTransfer).toHaveBeenCalledWith("dl-1", { isAutoTransfer: true });
    });
  });

  it("persists torrent errors", async () => {
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-1",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie.mkv", done: false }),
        createdAt: new Date(),
      })
      .run();

    const torrent = createFakeTorrent();
    setupTorrentHandlers(torrent as never, "dl-1");
    torrent.emit("error", new Error("peer ban"));

    await vi.waitFor(async () => {
      const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-1") });
      expect(row?.error).toContain("peer ban");
    });
  });

  it("restoreActiveTorrents is a no-op when nothing active", async () => {
    await restoreActiveTorrents();
    stopHealthCheck();
  });
});
