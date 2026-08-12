import { describe, expect, it, vi } from "vitest";

import { Readable } from "node:stream";
import { FtpAdapter } from "./adapters/ftp.adapter";
import type { StorageConnectionOptions } from "./adapters/storage.adapter";
import { WebdavAdapter } from "./adapters/webdav.adapter";

const ftpOpts: StorageConnectionOptions = {
  protocol: "ftp",
  host: "192.168.1.254",
  port: 21,
  username: "user",
  password: "pass",
  secure: false,
};

const webdavOpts: StorageConnectionOptions = {
  protocol: "webdav",
  host: "nas.local",
  port: 443,
  username: "admin",
  password: "secret",
  secure: true,
};

const ftpMockClient = {
  access: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue([{ name: "movie.mkv", isFile: true, isDirectory: false, size: 1024 }]),
  size: vi.fn().mockResolvedValue(1024),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  cd: vi.fn().mockResolvedValue(undefined),
  pwd: vi.fn().mockResolvedValue("/"),
  uploadFrom: vi.fn().mockResolvedValue(undefined),
  downloadTo: vi.fn().mockResolvedValue(undefined),
  trackProgress: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  removeDir: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
  availableListCommands: [] as string[],
};

vi.mock("basic-ftp", () => ({
  Client: class MockClient {
    access = ftpMockClient.access;
    list = ftpMockClient.list;
    size = ftpMockClient.size;
    ensureDir = ftpMockClient.ensureDir;
    cd = ftpMockClient.cd;
    pwd = ftpMockClient.pwd;
    uploadFrom = ftpMockClient.uploadFrom;
    downloadTo = ftpMockClient.downloadTo;
    trackProgress = ftpMockClient.trackProgress;
    remove = ftpMockClient.remove;
    removeDir = ftpMockClient.removeDir;
    rename = ftpMockClient.rename;
    close = ftpMockClient.close;
    availableListCommands = ftpMockClient.availableListCommands;
  },
}));

const webdavMockClient = {
  getDirectoryContents: vi.fn().mockResolvedValue([]),
  createDirectory: vi.fn().mockResolvedValue(undefined),
  putFileContents: vi.fn().mockResolvedValue(true),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  moveFile: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ type: "file", size: 2048, filename: "/movie.mkv" }),
  createReadStream: vi.fn().mockReturnValue(Readable.from([Buffer.from("x")])),
};

vi.mock("webdav", () => ({
  createClient: vi.fn(() => webdavMockClient),
}));

describe("FtpAdapter", () => {
  const adapter = new FtpAdapter();

  it("testConnection returns success on valid connection", async () => {
    const result = await adapter.testConnection(ftpOpts);
    expect(result.success).toBe(true);
    expect(ftpMockClient.access).toHaveBeenCalled();
    expect(ftpMockClient.list).toHaveBeenCalled();
  });

  it("testConnection returns failure on access error", async () => {
    ftpMockClient.access.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const result = await adapter.testConnection(ftpOpts);
    expect(result.success).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("remove does not throw", async () => {
    await expect(adapter.remove("movie.mkv", ftpOpts)).resolves.not.toThrow();
  });

  it("listDirectories maps entries", async () => {
    ftpMockClient.list.mockResolvedValueOnce([
      { name: "Folder", isDirectory: true, isFile: false, size: 0 },
      { name: "clip.mkv", isDirectory: false, isFile: true, size: 10 },
    ]);
    const dirs = await adapter.listDirectories("movies", ftpOpts);
    expect(dirs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Folder", type: "directory" }),
        expect.objectContaining({ name: "clip.mkv", type: "file" }),
      ]),
    );
  });

  it("ensureDirectory and moveFile call client APIs", async () => {
    await adapter.ensureDirectory("movies/New", ftpOpts);
    expect(ftpMockClient.ensureDir).toHaveBeenCalled();
    await adapter.moveFile("movies/a.mkv", "movies/b.mkv", ftpOpts);
    expect(ftpMockClient.rename).toHaveBeenCalled();
  });

  it("transferDirectory uploads a local file", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-ftp-"));
    const file = path.join(tmp, "movie.mkv");
    await fs.writeFile(file, Buffer.from("data"));
    try {
      const onProgress = vi.fn();
      await adapter.transferDirectory(file, "movies/movie.mkv", ftpOpts, onProgress);
      expect(ftpMockClient.uploadFrom).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(1);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("createReadStream returns a stream handle", async () => {
    const result = await adapter.createReadStream("movies/movie.mkv", ftpOpts);
    expect(result.size).toBe(1024);
    expect(result.stream).toBeTruthy();
    result.cleanup?.();
  });
});

describe("WebdavAdapter", () => {
  const adapter = new WebdavAdapter();

  it("testConnection returns success on valid connection", async () => {
    const result = await adapter.testConnection(webdavOpts);
    expect(result.success).toBe(true);
    expect(webdavMockClient.getDirectoryContents).toHaveBeenCalled();
  });

  it("testConnection returns failure on error", async () => {
    webdavMockClient.getDirectoryContents.mockRejectedValueOnce(new Error("401"));
    const result = await adapter.testConnection(webdavOpts);
    expect(result.success).toBe(false);
  });

  it("remove does not throw", async () => {
    await expect(adapter.remove("movie.mkv", webdavOpts)).resolves.not.toThrow();
    expect(webdavMockClient.deleteFile).toHaveBeenCalled();
  });

  it("listDirectories / ensureDirectory / moveFile work", async () => {
    webdavMockClient.getDirectoryContents.mockResolvedValueOnce([
      { filename: "/movies/Folder", basename: "Folder", type: "directory", size: 0 },
      { filename: "/movies/clip.mkv", basename: "clip.mkv", type: "file", size: 1 },
    ]);
    const dirs = await adapter.listDirectories("movies", webdavOpts);
    expect(dirs.some((d) => d.name === "Folder" && d.type === "directory")).toBe(true);

    await adapter.ensureDirectory("movies/New", webdavOpts);
    expect(webdavMockClient.createDirectory).toHaveBeenCalled();
    await adapter.moveFile("a.mkv", "b.mkv", webdavOpts);
    expect(webdavMockClient.moveFile).toHaveBeenCalled();
  });

  it("transferDirectory uploads a local file", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "seedarr-dav-"));
    const file = path.join(tmp, "movie.mkv");
    await fs.writeFile(file, Buffer.from("data"));
    try {
      await adapter.transferDirectory(file, "movies/movie.mkv", webdavOpts);
      expect(webdavMockClient.putFileContents).toHaveBeenCalled();
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });

  it("createReadStream returns sized stream", async () => {
    const result = await adapter.createReadStream("movies/movie.mkv", webdavOpts);
    expect(result.size).toBe(2048);
  });
});
