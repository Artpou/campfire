import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { module } from "@/modules/module/module.schema";
import { createTestDb, seedTestUser, testDbRef } from "@/tests/test.helper";

const {
  getTmdbApiKey,
  listDirectories,
  listFiles,
  ensureDirectory,
  moveFile,
  fetchTmdbById,
  fetchTmdbByImdbId,
  searchTmdbByTitle,
  tmdbItemToMediaInsert,
} = vi.hoisted(() => ({
  getTmdbApiKey: vi.fn(),
  listDirectories: vi.fn(),
  listFiles: vi.fn(),
  ensureDirectory: vi.fn(),
  moveFile: vi.fn(),
  fetchTmdbById: vi.fn(),
  fetchTmdbByImdbId: vi.fn(),
  searchTmdbByTitle: vi.fn(),
  tmdbItemToMediaInsert: vi.fn(),
}));

vi.mock("@/modules/tmdb/tmdb-key.query", () => ({
  getTmdbApiKey,
}));

vi.mock("./remote-storage.service", () => ({
  remoteStorageService: {
    listDirectories,
    listFiles,
    ensureDirectory,
    moveFile,
    isEnabled: vi.fn().mockResolvedValue(true),
    getMediaPaths: vi.fn().mockResolvedValue({ moviePath: "movies", tvPath: "tv" }),
  },
}));

vi.mock("@/modules/tmdb/tmdb-resolve.helper", () => ({
  fetchTmdbById,
  fetchTmdbByImdbId,
  searchTmdbByTitle,
  sleep: vi.fn().mockResolvedValue(undefined),
  tmdbItemToMediaInsert,
}));

const { runManualSync, runRemoteSync } = await import("./remote-sync.service");

describe("remote-sync.service", () => {
  const user = { id: "user-1", username: "u", role: "admin" as const, createdAt: new Date() };

  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    getTmdbApiKey.mockReset().mockResolvedValue("tmdb-key");
    listDirectories.mockReset().mockResolvedValue([]);
    listFiles.mockReset().mockResolvedValue([{ name: "a.mkv", path: "a.mkv", length: 12 }]);
    ensureDirectory.mockReset().mockResolvedValue(undefined);
    moveFile.mockReset().mockResolvedValue(undefined);
    fetchTmdbById.mockReset();
    fetchTmdbByImdbId.mockReset();
    searchTmdbByTitle.mockReset();
    tmdbItemToMediaInsert.mockReset().mockImplementation((item: { id: number; title?: string }, type: string) => ({
      id: item.id,
      type,
      title: item.title ?? "Title",
      imdbId: "tt0000001",
    }));
  });

  function seedStorage(enabled = true) {
    testDbRef.current
      .insert(module)
      .values({
        id: "cfg",
        type: "ftp",
        category: "storage",
        enabled,
        config: {
          host: "nas",
          port: 21,
          secure: false,
          moviePath: "movies",
          tvPath: "tv",
          autoTransfer: false,
          deleteLocalAfterTransfer: false,
        },
        updatedAt: new Date(),
      })
      .run();
  }

  it("runRemoteSync requires TMDB key and enabled storage", async () => {
    getTmdbApiKey.mockResolvedValue(null);
    await expect(runRemoteSync(user.id)).rejects.toThrow(/TMDB API key/);

    getTmdbApiKey.mockResolvedValue("key");
    const { remoteStorageService } = await import("./remote-storage.service");
    vi.mocked(remoteStorageService.isEnabled).mockResolvedValueOnce(false);
    await expect(runRemoteSync(user.id)).rejects.toThrow(/not configured or disabled/);
  });

  it("runRemoteSync syncs directories matched by {tmdb-id}", async () => {
    seedStorage(true);
    listDirectories.mockImplementation(async (base: string) => {
      if (base === "movies") {
        return [{ name: "Dune {tmdb-123}", path: "Dune {tmdb-123}", type: "directory" }];
      }
      return [];
    });
    fetchTmdbById.mockResolvedValue({
      id: 123,
      title: "Dune",
      release_date: "2021-01-01",
    });

    const result = await runRemoteSync(user.id);
    expect(result.synced).toBe(1);
    expect(result.errors).toEqual([]);

    const dl = await testDbRef.current.query.download.findFirst();
    expect(dl?.remoteLocation).toContain("Dune");
    expect(dl?.mediaId).toBe(123);
  });

  it("runRemoteSync skips already imported remote locations", async () => {
    seedStorage(true);
    testDbRef.current.insert(media).values({ id: 1, type: "movie", title: "Old", imdbId: "tt1" }).run();
    testDbRef.current
      .insert(download)
      .values({
        id: "dl-existing",
        userId: user.id,
        mediaId: 1,
        remoteLocation: "movies/Dune {tmdb-123}",
        torrent: null,
        createdAt: new Date(),
      })
      .run();

    listDirectories.mockImplementation(async (base: string) => {
      if (base === "movies") {
        return [{ name: "Dune {tmdb-123}", path: "Dune {tmdb-123}", type: "directory" }];
      }
      return [];
    });
    fetchTmdbById.mockResolvedValue({ id: 123, title: "Dune", release_date: "2021-01-01" });

    const result = await runRemoteSync(user.id);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(result.synced).toBe(0);
  });

  it("runManualSync creates download for TMDB media", async () => {
    fetchTmdbById.mockResolvedValue({ id: 55, title: "Manual Film", release_date: "2020-01-01" });

    await expect(
      runManualSync(user.id, { mediaId: 55, type: "movie", remotePath: "movies/Manual.mkv" }),
    ).resolves.toEqual({ success: true });

    const row = await testDbRef.current.query.download.findFirst({ where: eq(download.mediaId, 55) });
    expect(row?.mediaId).toBe(55);
    expect(row?.remoteLocation).toBe("movies/Manual Film (2020)");
    expect(moveFile).toHaveBeenCalled();
  });

  it("runManualSync is idempotent for same remote path", async () => {
    fetchTmdbById.mockResolvedValue({ id: 55, title: "Manual Film", release_date: "2020-01-01" });
    await runManualSync(user.id, { mediaId: 55, type: "movie", remotePath: "movies/Manual.mkv" });
    await runManualSync(user.id, { mediaId: 55, type: "movie", remotePath: "movies/Manual.mkv" });

    const rows = await testDbRef.current.query.download.findMany();
    expect(rows).toHaveLength(1);
  });
});
