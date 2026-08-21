import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Download } from "@/modules/download/download.schema";
import { download as downloadTable } from "@/modules/download/download.schema";
import { createTestDb, sampleTorrent, seedTestUser, testDbRef } from "@/tests/test.helper";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";

const {
  getActiveTorrent,
  findLargestVideoFile,
  resolveRemoteVideoInfo,
  probeVideoStreams,
  convertToFragmentedMp4Stream,
} = vi.hoisted(() => ({
  getActiveTorrent: vi.fn(),
  findLargestVideoFile: vi.fn(),
  resolveRemoteVideoInfo: vi.fn(),
  probeVideoStreams: vi.fn(),
  convertToFragmentedMp4Stream: vi.fn(),
}));

vi.mock("@/modules/download/webtorrent/webtorrent-manager", () => ({
  torrentClient: { getActiveTorrent },
}));

vi.mock("@/modules/download/webtorrent/webtorrent.helper", () => ({
  findLargestVideoFile,
}));

vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: {
    createReadStream: vi.fn(),
  },
}));

vi.mock("./streaming.helper", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./streaming.helper")>();
  return {
    ...actual,
    resolveRemoteVideoInfo,
  };
});

vi.mock("@/shared/helpers/video.helper", () => ({
  probeVideoStreams,
  convertToFragmentedMp4Stream,
  getVideoInputFormat: (name: string) => (name.endsWith(".mkv") ? "matroska" : undefined),
}));

const { StreamingService, invalidateStreamSource } = await import("./streaming.service");

describe("StreamingService", () => {
  let tmpRoot: string;
  let previousDownloadsPath: string | undefined;
  const service = new StreamingService();
  const user = { id: "user-1", username: "u", role: "member" as const, createdAt: new Date() };

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-stream-"));
    previousDownloadsPath = process.env.DOWNLOADS_PATH;
    process.env.DOWNLOADS_PATH = tmpRoot;
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, user);
    getActiveTorrent.mockReset();
    findLargestVideoFile.mockReset();
    resolveRemoteVideoInfo.mockReset();
    probeVideoStreams.mockReset();
    convertToFragmentedMp4Stream.mockReset();
  });

  afterEach(async () => {
    process.env.DOWNLOADS_PATH = previousDownloadsPath;
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  function dl(overrides: Partial<Download> = {}): Download {
    return {
      id: "dl-1",
      userId: user.id,
      torrent: { name: "Movie", done: true, progress: 1, length: 100, durationSeconds: 90 },
      createdAt: new Date(),
      ...overrides,
    } as Download;
  }

  it("resolves local disk source and playback info", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.alloc(2048));

    invalidateStreamSource("dl-1");
    const info = await service.getPlaybackInfo(dl());
    expect(info).toMatchObject({ mode: "direct", seekable: true, origin: "local", duration: 90 });
  });

  it("uses cache on second resolveSourceInfo", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.alloc(1024));
    invalidateStreamSource("dl-1");

    const first = await service.resolveSourceInfo(dl());
    const second = await service.resolveSourceInfo(dl());
    expect(first).toEqual(second);
    expect(first?.fileName).toBe("Movie.mkv");
  });

  it("falls back to active torrent file metadata", async () => {
    invalidateStreamSource("dl-torrent");
    getActiveTorrent.mockReturnValue({ name: "Live" });
    findLargestVideoFile.mockReturnValue({ name: "Live.mkv", length: 999 });

    const info = await service.resolveSourceInfo(
      dl({ id: "dl-torrent", torrent: { name: "Live", done: false, progress: 0.2 } as Download["torrent"] }),
    );
    expect(info).toEqual({ size: 999, fileName: "Live.mkv", hasTorrentFile: true });
  });

  it("resolves remote source when available", async () => {
    invalidateStreamSource("dl-remote");
    resolveRemoteVideoInfo.mockResolvedValue({
      size: 500,
      fileName: "Remote.mkv",
      remotePath: "/movies/Remote.mkv",
    });

    const info = await service.resolveSourceInfo(
      dl({ id: "dl-remote", remoteLocation: "/movies/Remote", torrent: null }),
    );
    expect(info).toMatchObject({ isRemote: true, remotePath: "/movies/Remote.mkv", fileName: "Remote.mkv" });
  });

  it("prepareDirectStream returns 416 for unsatisfiable range", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.alloc(100));
    invalidateStreamSource("dl-1");

    const result = await service.prepareDirectStream(dl(), "bytes=1000-2000");
    expect(result.status).toBe(416);
    expect(result.headers["Content-Range"]).toContain("*/100");
  });

  it("prepareDirectStream pipes local file bytes", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.from("abcd"));
    invalidateStreamSource("dl-1");

    const result = await service.prepareDirectStream(dl(), undefined);
    expect(result.status).toBe(200);
    expect(result.pipe).toBeTypeOf("function");

    const chunks: Uint8Array[] = [];
    await result.pipe?.({
      onAbort: vi.fn(),
      pipe: async (webStream: ReadableStream<Uint8Array>) => {
        const reader = webStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      },
    } as never);
    expect(Buffer.concat(chunks).toString()).toBe("abcd");
  });

  it("prepareLiveStream remuxes from file path", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    const filePath = path.join(folder, "Movie.mkv");
    await fs.writeFile(filePath, Buffer.from("mkvdata"));
    invalidateStreamSource("dl-1");

    const remuxStream = new PassThrough();
    convertToFragmentedMp4Stream.mockReturnValue({
      stream: remuxStream,
      destroy: vi.fn(),
    });
    queueMicrotask(() => {
      remuxStream.write("mp4");
      remuxStream.end();
    });

    const result = await service.prepareLiveStream(dl());
    expect(result.headers["Content-Type"]).toBe("video/mp4");
    expect(result.headers["X-Video-Duration"]).toBe("90");

    const chunks: Uint8Array[] = [];
    await result.pipe({
      onAbort: vi.fn(),
      pipe: async (webStream: ReadableStream<Uint8Array>) => {
        const reader = webStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      },
    } as never);
    expect(Buffer.concat(chunks).toString()).toBe("mp4");
  });

  it("probes and caches duration when missing", async () => {
    const folder = path.join(tmpRoot, "Movie");
    await fs.mkdir(folder);
    await fs.writeFile(path.join(folder, "Movie.mkv"), Buffer.alloc(512));
    invalidateStreamSource("dl-probe");

    testDbRef.current
      .insert(downloadTable)
      .values({
        id: "dl-probe",
        userId: user.id,
        torrent: sampleTorrent({ name: "Movie", done: true, length: 512 }),
        createdAt: new Date(),
      })
      .run();

    probeVideoStreams.mockResolvedValue({ duration: 55, videoCodec: "h264", audioCodec: "aac" });

    const info = await service.getPlaybackInfo(
      dl({
        id: "dl-probe",
        torrent: { name: "Movie", done: true, length: 512 } as Download["torrent"],
      }),
    );
    expect(info.duration).toBe(55);
  });

  it("throws NotFound when no source exists", async () => {
    invalidateStreamSource("dl-missing");
    getActiveTorrent.mockReturnValue(undefined);
    await expect(service.getPlaybackInfo(dl({ id: "dl-missing", torrent: null }))).rejects.toThrow(/Video file/);
  });
});
