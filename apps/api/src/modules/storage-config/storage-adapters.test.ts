import { describe, expect, it, vi } from "vitest";

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
  list: vi.fn().mockResolvedValue([{ name: "movie.mkv" }]),
  size: vi.fn().mockResolvedValue(1024),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  cd: vi.fn().mockResolvedValue(undefined),
  pwd: vi.fn().mockResolvedValue("/"),
  uploadFrom: vi.fn().mockResolvedValue(undefined),
  trackProgress: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  removeDir: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
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
    trackProgress = ftpMockClient.trackProgress;
    remove = ftpMockClient.remove;
    removeDir = ftpMockClient.removeDir;
    close = ftpMockClient.close;
  },
}));

const webdavMockClient = {
  getDirectoryContents: vi.fn().mockResolvedValue([]),
  createDirectory: vi.fn().mockResolvedValue(undefined),
  putFileContents: vi.fn().mockResolvedValue(true),
  deleteFile: vi.fn().mockResolvedValue(undefined),
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

  it("remove does not throw", async () => {
    await expect(adapter.remove("movie.mkv", ftpOpts)).resolves.not.toThrow();
  });
});

describe("WebdavAdapter", () => {
  const adapter = new WebdavAdapter();

  it("testConnection returns success on valid connection", async () => {
    const result = await adapter.testConnection(webdavOpts);
    expect(result.success).toBe(true);
    expect(webdavMockClient.getDirectoryContents).toHaveBeenCalled();
  });

  it("remove does not throw", async () => {
    await expect(adapter.remove("movie.mkv", webdavOpts)).resolves.not.toThrow();
    expect(webdavMockClient.deleteFile).toHaveBeenCalled();
  });
});
