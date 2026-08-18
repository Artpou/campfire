import { beforeEach, describe, expect, it, vi } from "vitest";

import { module } from "@/modules/module/module.schema";
import { seedTestUser } from "@/tests/route-test.helper";
import { createTestDb, type TestDb } from "@/tests/test.helper";
import { encrypt } from "../../../shared/helpers/crypto.helper";
import { invalidateStorageConfigCache, remoteStorageService } from "./remote-storage.service";

const { testDbRef, ftpTest, ftpTransfer, ftpRemove, ftpListDirs, ftpListFiles, ftpMove, ftpEnsure, ftpStream } =
  vi.hoisted(() => ({
    testDbRef: { current: null as TestDb | null },
    ftpTest: vi.fn(),
    ftpTransfer: vi.fn(),
    ftpRemove: vi.fn(),
    ftpListDirs: vi.fn(),
    ftpListFiles: vi.fn(),
    ftpMove: vi.fn(),
    ftpEnsure: vi.fn(),
    ftpStream: vi.fn(),
  }));

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));

vi.mock("@/modules/module/module.seed", () => ({
  ensureSystemModules: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../adapters/ftp.adapter", () => ({
  FtpAdapter: class {
    testConnection = ftpTest;
    transferDirectory = ftpTransfer;
    remove = ftpRemove;
    listDirectories = ftpListDirs;
    listFiles = ftpListFiles;
    moveFile = ftpMove;
    ensureDirectory = ftpEnsure;
    createReadStream = ftpStream;
  },
}));

describe("remoteStorageService", () => {
  const user = { id: "user-1", username: "u", role: "owner" as const, createdAt: new Date() };

  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    invalidateStorageConfigCache();
    ftpTest.mockReset().mockResolvedValue({ success: true });
    ftpTransfer.mockReset().mockResolvedValue(undefined);
    ftpRemove.mockReset().mockResolvedValue(undefined);
    ftpListDirs.mockReset().mockResolvedValue([{ name: "Movie", path: "Movie", type: "directory" }]);
    ftpListFiles.mockReset().mockResolvedValue([{ name: "a.mkv", path: "a.mkv", length: 10 }]);
    ftpMove.mockReset().mockResolvedValue(undefined);
    ftpEnsure.mockReset().mockResolvedValue(undefined);
    ftpStream.mockReset().mockResolvedValue({ stream: {} as never, size: 10 });
  });

  function seedConfig(overrides: { enabled?: boolean; deleteLocalAfterTransfer?: boolean } = {}) {
    testDbRef.current
      ?.insert(module)
      .values({
        id: "cfg-1",
        type: "ftp",
        category: "storage",
        enabled: overrides.enabled ?? true,
        config: {
          host: "nas.local",
          port: 21,
          secure: false,
          moviePath: "movies",
          tvPath: "tv",
          username: "user",
          password: encrypt("secret"),
          autoTransfer: false,
          deleteLocalAfterTransfer: overrides.deleteLocalAfterTransfer ?? false,
        },
        updatedAt: new Date(),
      })
      .run();
  }

  it("reports disabled when no config", async () => {
    await expect(remoteStorageService.isEnabled()).resolves.toBe(false);
    await expect(remoteStorageService.getConnectionOptions()).resolves.toBeNull();
  });

  it("loads connection options and path helpers", async () => {
    seedConfig({ deleteLocalAfterTransfer: true });
    await expect(remoteStorageService.isEnabled()).resolves.toBe(true);
    await expect(remoteStorageService.shouldDeleteLocalAfterTransfer()).resolves.toBe(true);
    await expect(remoteStorageService.resolveTransferPath("Dune", "movie")).resolves.toBe("movies/Dune");
    await expect(remoteStorageService.resolveTransferPath("Show", "tv")).resolves.toBe("tv/Show");
  });

  it("isAvailable uses adapter testConnection", async () => {
    seedConfig();
    await expect(remoteStorageService.isAvailable()).resolves.toBe(true);
    ftpTest.mockResolvedValue({ success: false, error: "down" });
    invalidateStorageConfigCache();
    await expect(remoteStorageService.isAvailable()).resolves.toBe(false);
  });

  it("rejects path traversal", async () => {
    seedConfig();
    await expect(remoteStorageService.listFiles("../etc")).rejects.toThrow(/Path traversal/);
    await expect(remoteStorageService.transferDirectory("/tmp", "../x")).rejects.toThrow(/Path traversal/);
  });

  it("delegates list/remove/move/ensure/stream/transfer", async () => {
    seedConfig();
    await expect(remoteStorageService.listDirectories("movies")).resolves.toHaveLength(1);
    await expect(remoteStorageService.listFiles("movies/X")).resolves.toHaveLength(1);
    await remoteStorageService.remove("movies/X");
    await remoteStorageService.moveFile("a", "b");
    await remoteStorageService.ensureDirectory("movies/New");
    await remoteStorageService.createReadStream("movies/X");
    await remoteStorageService.transferDirectory("/local", "movies/X");
    expect(ftpRemove).toHaveBeenCalled();
    expect(ftpMove).toHaveBeenCalled();
    expect(ftpEnsure).toHaveBeenCalled();
    expect(ftpStream).toHaveBeenCalled();
    expect(ftpTransfer).toHaveBeenCalled();
  });

  it("testConnection goes through adapter without DB config", async () => {
    await expect(
      remoteStorageService.testConnection({
        protocol: "ftp",
        host: "h",
        port: 21,
        username: "u",
        password: "p",
        secure: false,
      }),
    ).resolves.toEqual({ success: true });
  });

  it("throws when transfer required but storage unconfigured", async () => {
    await expect(remoteStorageService.transferDirectory("/l", "r")).rejects.toThrow(/not configured/);
  });
});
