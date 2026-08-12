import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TorrentLiveData } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { seedTestUser } from "@/tests/route-test.helper";
import { createTestDb, sampleTorrent, type TestDb } from "@/tests/test.helper";
import { DownloadService } from "./download.service";

const { testDbRef, isEnabled, isAvailable, listFiles, remove, pauseTorrent, destroyLocalTorrentFiles } = vi.hoisted(
  () => ({
    testDbRef: { current: null as TestDb | null },
    isEnabled: vi.fn(),
    isAvailable: vi.fn(),
    listFiles: vi.fn(),
    remove: vi.fn(),
    pauseTorrent: vi.fn(),
    destroyLocalTorrentFiles: vi.fn(),
  }),
);

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));

vi.mock("@/modules/storage-config/remote-storage.service", () => ({
  remoteStorageService: { isEnabled, isAvailable, listFiles, remove },
}));

vi.mock("./webtorrent/webtorrent.service", () => ({
  pauseTorrent,
  resumeTorrent: vi.fn().mockResolvedValue({ success: true }),
  recheckTorrent: vi.fn().mockResolvedValue({ success: true }),
  reannounceTorrent: vi.fn().mockResolvedValue({ success: true }),
  destroyLocalTorrentFiles,
}));

vi.mock("./remote/remote-transfer.helper", () => ({
  isTransferInProgress: vi.fn().mockReturnValue(false),
  markTransferStarting: vi.fn().mockResolvedValue(undefined),
  runRemoteTransfer: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/streaming/streaming.service", () => ({
  invalidateStreamSource: vi.fn(),
}));

vi.mock("@/modules/activity-log/activity-log.service", () => ({
  ActivityLogService: { log: vi.fn() },
}));

vi.mock("@/modules/download/local/local-file.helper", () => ({
  getDownloadableFile: vi.fn().mockResolvedValue({ fileName: "a.mkv", size: 1, filePath: "/tmp/a.mkv" }),
}));

describe("DownloadService", () => {
  const user = { id: "user-1", username: "u", role: "member" as const, createdAt: new Date() };
  let service: DownloadService;

  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    service = new DownloadService(user as never);
    isEnabled.mockReset().mockResolvedValue(true);
    isAvailable.mockReset().mockResolvedValue(true);
    listFiles.mockReset().mockResolvedValue([{ name: "a.mkv", path: "a.mkv", length: 10 }]);
    remove.mockReset().mockResolvedValue(undefined);
    pauseTorrent.mockReset().mockResolvedValue({ success: true });
    destroyLocalTorrentFiles.mockReset();
  });

  function seedDownload(
    id: string,
    overrides: {
      mediaId?: number | null;
      remoteLocation?: string | null;
      size?: number | null;
      torrent?: Partial<TorrentLiveData>;
    } = {},
  ) {
    const { torrent: torrentOverrides, ...rest } = overrides;
    testDbRef.current
      ?.insert(download)
      .values({
        id,
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie", done: true, length: 1000, ...torrentOverrides }),
        size: 1000,
        createdAt: new Date(),
        ...rest,
      })
      .run();
  }

  it("getStats aggregates size and speeds", async () => {
    seedDownload("dl-1");
    seedDownload("dl-2", {
      torrent: {
        name: "Active",
        done: false,
        paused: false,
        length: 500,
        downloadSpeed: 100,
        uploadSpeed: 10,
        numPeers: 3,
      },
      size: 500,
    });

    await expect(service.getStats()).resolves.toEqual({
      count: 2,
      totalSize: 1500,
      downloadSpeed: 100,
      uploadSpeed: 10,
      peers: 3,
    });
  });

  it("getByMediaId filters downloads", async () => {
    testDbRef.current?.insert(media).values({ id: 7, type: "movie", title: "X", imdbId: "tt7" }).run();
    seedDownload("dl-1", { mediaId: 7 });
    seedDownload("dl-2", { mediaId: null });

    const rows = await service.getByMediaId(7);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("dl-1");
  });

  it("createFileToken returns a signed token", () => {
    const { token } = service.createFileToken("dl-1");
    expect(token).toContain(".");
  });

  it("transfer validates preconditions", async () => {
    seedDownload("dl-incomplete", { torrent: { name: "X", done: false } });
    await expect(service.transfer("dl-incomplete")).rejects.toThrow(/not complete/);

    seedDownload("dl-remote", { remoteLocation: "/movies/X" });
    await expect(service.transfer("dl-remote")).rejects.toThrow(/Already present/);

    isEnabled.mockResolvedValue(false);
    seedDownload("dl-ok");
    await expect(service.transfer("dl-ok")).rejects.toThrow(/not enabled/);
  });

  it("transfer starts when remote is available", async () => {
    seedDownload("dl-ok");
    await expect(service.transfer("dl-ok")).resolves.toEqual({ success: true });
  });

  it("listRemoteFiles returns [] without remoteLocation", async () => {
    seedDownload("dl-local");
    await expect(service.listRemoteFiles("dl-local")).resolves.toEqual([]);
  });

  it("listRemoteFiles proxies remote listing", async () => {
    seedDownload("dl-remote", { remoteLocation: "/movies/X" });
    await expect(service.listRemoteFiles("dl-remote")).resolves.toEqual([{ name: "a.mkv", path: "a.mkv", length: 10 }]);
  });

  it("reassignMedia updates mediaId", async () => {
    testDbRef.current?.insert(media).values({ id: 99, type: "movie", title: "Y", imdbId: "tt99" }).run();
    seedDownload("dl-1", { mediaId: null });
    await expect(service.reassignMedia("dl-1", 99)).resolves.toEqual({ success: true });
    const row = await testDbRef.current?.query.download.findFirst({ where: eq(download.id, "dl-1") });
    expect(row?.mediaId).toBe(99);
  });

  it("delete dbOnly requires admin", async () => {
    seedDownload("dl-1");
    await expect(service.delete("dl-1", { dbOnly: true })).rejects.toThrow();
  });

  it("delete removes owned download", async () => {
    seedDownload("dl-1");
    await expect(service.delete("dl-1", { scope: "all" })).resolves.toEqual({ success: true });
    const row = await testDbRef.current?.query.download.findFirst({ where: eq(download.id, "dl-1") });
    expect(row).toBeUndefined();
    expect(destroyLocalTorrentFiles).toHaveBeenCalled();
  });

  it("batchDelete skips foreign downloads for members", async () => {
    seedTestUser(testDbRef.current!, {
      id: "user-2",
      username: "other",
      role: "member",
      createdAt: new Date(),
    });
    seedDownload("mine");
    testDbRef.current
      ?.insert(download)
      .values({
        id: "theirs",
        userId: "user-2",
        torrent: sampleTorrent({ name: "Other", done: true }),
        createdAt: new Date(),
      })
      .run();

    await expect(service.batchDelete(["mine", "theirs"], { dbOnly: false })).resolves.toEqual({
      deleted: 1,
      skipped: 1,
    });
  });

  it("pause delegates to webtorrent service", async () => {
    seedDownload("dl-1");
    await expect(service.pause("dl-1")).resolves.toEqual({ success: true });
    expect(pauseTorrent).toHaveBeenCalled();
  });
});
