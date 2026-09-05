import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { createTestDb, sampleTorrent, seedTestUser, testDbRef } from "@/tests/test.helper";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { transferDirectory, remove, resolveTransferPath, shouldDeleteLocalAfterTransfer, getActiveTorrent } = vi.hoisted(
  () => ({
    transferDirectory: vi.fn(),
    remove: vi.fn(),
    resolveTransferPath: vi.fn(),
    shouldDeleteLocalAfterTransfer: vi.fn(),
    getActiveTorrent: vi.fn(),
  }),
);

vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: {
    transferDirectory,
    remove,
    getMediaPaths: vi.fn().mockResolvedValue({ moviePath: "movies", tvPath: "tv" }),
    shouldDeleteLocalAfterTransfer,
  },
}));

vi.mock("@/modules/download/webtorrent/webtorrent-manager", () => ({
  torrentClient: {
    getActiveTorrent,
    markDestroying: vi.fn(),
    deleteActiveTorrent: vi.fn(),
    unmarkDestroying: vi.fn(),
  },
  UNMARK_DESTROYING_DELAY_MS: 1,
}));

vi.mock("@/modules/streaming/streaming-lease", () => ({
  waitUntilNoStreams: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/streaming/streaming-cache.helper", () => ({
  invalidateStreamSource: vi.fn(),
}));

vi.mock("@/modules/activity/activity.service", () => ({
  ActivityService: class {
    log = vi.fn();
  },
  activityFor: () => ({ log: vi.fn() }),
  trackRoute: async (_c: unknown, _input: unknown, fn: () => unknown) => fn(),
}));

const { isTransferInProgress, markTransferStarting, runRemoteTransfer } = await import("./remote-transfer.helper");

describe("remote-transfer.helper", () => {
  let tmpRoot: string;
  let previousDownloadsPath: string | undefined;
  const user = { id: "user-1", username: "u", role: "member" as const, createdAt: new Date() };

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-xfer-"));
    previousDownloadsPath = process.env.DOWNLOADS_PATH;
    process.env.DOWNLOADS_PATH = tmpRoot;
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    transferDirectory.mockReset().mockImplementation(async (_l, _r, onProgress) => {
      await onProgress?.(0.5);
      await onProgress?.(1);
    });
    remove.mockReset().mockResolvedValue(undefined);
    resolveTransferPath.mockReset().mockResolvedValue("movies/Movie");
    shouldDeleteLocalAfterTransfer.mockReset().mockResolvedValue(false);
    getActiveTorrent.mockReset().mockReturnValue(undefined);
  });

  afterEach(async () => {
    process.env.DOWNLOADS_PATH = previousDownloadsPath;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  async function seedDoneDownload(id = "dl-1") {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.alloc(100));

    testDbRef.current.insert(media).values({ id: 1, type: "movie", title: "Movie", imdbId: "tt1" }).run();

    testDbRef.current
      .insert(download)
      .values({
        id,
        userId: user.id,
        mediaId: 1,
        torrent: sampleTorrent({ name: "Movie", done: true, length: 100, transferring: false }),
        createdAt: new Date(),
      })
      .run();
  }

  it("markTransferStarting sets transferring flag", async () => {
    await seedDoneDownload();
    await markTransferStarting("dl-1");
    const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-1") });
    expect(row?.torrent?.transferring).toBe(true);
    expect(row?.torrent?.transferProgress).toBe(0);
  });

  it("runRemoteTransfer uploads and stores remoteLocation", async () => {
    await seedDoneDownload();
    await runRemoteTransfer("dl-1");

    const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-1") });
    expect(row?.remoteLocation).toBe("movies/Movie");
    expect(row?.torrent?.transferring).toBe(false);
    expect(row?.torrent?.transferProgress).toBe(1);
    expect(transferDirectory).toHaveBeenCalled();
    expect(isTransferInProgress("dl-1")).toBe(false);
  });

  it("rejects concurrent transfers", async () => {
    await seedDoneDownload();
    transferDirectory.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const first = runRemoteTransfer("dl-1");
    await expect(runRemoteTransfer("dl-1")).rejects.toThrow(/already in progress/);
    await first;
  });

  it("rejects incomplete downloads", async () => {
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-partial",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie", done: false, length: 10 }),
        createdAt: new Date(),
      })
      .run();

    await expect(runRemoteTransfer("dl-partial")).rejects.toThrow(/not complete/);
  });

  it("records error state when transfer fails", async () => {
    await seedDoneDownload("dl-fail");
    transferDirectory.mockRejectedValue(new Error("NAS down"));

    await expect(runRemoteTransfer("dl-fail")).rejects.toThrow(/NAS down/);
    const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-fail") });
    expect(row?.error).toContain("Remote transfer failed");
    expect(row?.torrent?.transferring).toBe(false);
  });

  it("deletes local files after auto-transfer when configured", async () => {
    await seedDoneDownload("dl-auto");
    shouldDeleteLocalAfterTransfer.mockResolvedValue(true);

    await runRemoteTransfer("dl-auto", { isAutoTransfer: true });

    const row = await testDbRef.current.query.download.findFirst({ where: eq(download.id, "dl-auto") });
    expect(row?.torrent).toBeNull();
    expect(row?.remoteLocation).toBe("movies/Movie");
    await expect(fs.stat(path.join(tmpRoot, "Movie"))).rejects.toThrow();
  });
});
