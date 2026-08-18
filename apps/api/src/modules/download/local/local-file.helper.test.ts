import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import { seedTestUser } from "@/tests/route-test.helper";
import { createTestDb, sampleTorrent, type TestDb } from "@/tests/test.helper";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { testDbRef } = vi.hoisted(() => ({
  testDbRef: { current: null as TestDb | null },
}));

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));

vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: {
    listFiles: vi.fn(),
  },
}));

const { getDownloadableFile } = await import("./local-file.helper");

describe("getDownloadableFile", () => {
  let tmpRoot: string;
  let previousDownloadsPath: string | undefined;
  const user = { id: "user-1", username: "u", role: "member" as const, createdAt: new Date() };

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-dlfile-"));
    previousDownloadsPath = process.env.DOWNLOADS_PATH;
    process.env.DOWNLOADS_PATH = tmpRoot;
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
  });

  afterEach(async () => {
    process.env.DOWNLOADS_PATH = previousDownloadsPath;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it("throws when download is missing", async () => {
    await expect(getDownloadableFile("missing")).rejects.toThrow(/Download/);
  });

  it("returns the largest local video file", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "sample.mkv"), Buffer.alloc(2048));
    await fs.writeFile(path.join(folder, "sample.mp4"), Buffer.alloc(4096));

    testDbRef.current
      ?.insert(download)
      .values({
        id: "dl-1",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie", done: true, files: [] }),
        createdAt: new Date(),
      })
      .run();

    const result = await getDownloadableFile("dl-1");
    expect(result.fileName).toBe("sample.mp4");
    expect(result.size).toBe(4096);
    expect(result.filePath).toBe(path.join(folder, "sample.mp4"));
  });

  it("throws when no readable file exists", async () => {
    testDbRef.current
      ?.insert(download)
      .values({
        id: "dl-empty",
        userId: user.id,
        torrent: sampleTorrent({ name: "Empty", done: false, files: [] }),
        createdAt: new Date(),
      })
      .run();

    await expect(getDownloadableFile("dl-empty")).rejects.toThrow(/Downloadable file/);
  });
});
