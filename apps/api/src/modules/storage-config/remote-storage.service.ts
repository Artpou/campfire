import { db } from "@/db/db";
import path from "node:path";
import { FtpAdapter } from "./adapters/ftp.adapter";
import type { StorageAdapter, StorageConnectionOptions, StorageProtocol } from "./adapters/storage.adapter";
import { WebdavAdapter } from "./adapters/webdav.adapter";
import { decrypt } from "./crypto.helper";

function getAdapter(protocol: StorageProtocol): StorageAdapter {
  switch (protocol) {
    case "ftp":
      return new FtpAdapter();
    case "webdav":
      return new WebdavAdapter();
  }
}

function assertSafePath(remotePath: string): void {
  if (path.posix.normalize(remotePath).includes("..")) {
    throw new Error("Path traversal detected");
  }
}

function normalizeBasePath(basePath: string | null | undefined): string {
  if (!basePath) return "";
  return basePath.replace(/^\/+|\/+$/g, "");
}

class RemoteStorageService {
  async getConnectionOptions(): Promise<StorageConnectionOptions | null> {
    const config = await db.query.storageConfig.findFirst();
    if (!config?.host) return null;
    return {
      protocol: (config.protocol as StorageProtocol) ?? "ftp",
      host: config.host,
      port: config.port ?? 21,
      username: config.username,
      password: config.password ? decrypt(config.password) : null,
      secure: config.secure ?? false,
    };
  }

  async resolveTransferPath(torrentName: string, mediaType?: "movie" | "tv" | null): Promise<string> {
    const config = await db.query.storageConfig.findFirst();
    const basePath = mediaType === "tv" ? normalizeBasePath(config?.tvPath) : normalizeBasePath(config?.moviePath);
    return basePath ? path.posix.join(basePath, torrentName) : torrentName;
  }

  async isEnabled(): Promise<boolean> {
    const config = await db.query.storageConfig.findFirst();
    return config?.enabled === true;
  }

  async isConfigured(): Promise<boolean> {
    const opts = await this.getConnectionOptions();
    return opts !== null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const opts = await this.getConnectionOptions();
      if (!opts) return false;
      const adapter = getAdapter(opts.protocol);
      const result = await adapter.testConnection(opts);
      return result.success;
    } catch {
      return false;
    }
  }

  async testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }> {
    const adapter = getAdapter(opts.protocol);
    return adapter.testConnection(opts);
  }

  async exists(remotePath: string): Promise<boolean> {
    assertSafePath(remotePath);
    const opts = await this.getConnectionOptions();
    if (!opts) return false;
    const adapter = getAdapter(opts.protocol);
    return adapter.exists(remotePath, opts);
  }

  async transferDirectory(localDir: string, remoteDir: string, onProgress?: (progress: number) => void): Promise<void> {
    assertSafePath(remoteDir);
    const opts = await this.getConnectionOptions();
    if (!opts) throw new Error("Remote storage is not configured");
    const adapter = getAdapter(opts.protocol);
    return adapter.transferDirectory(localDir, remoteDir, opts, onProgress);
  }

  async shouldDeleteLocalAfterTransfer(): Promise<boolean> {
    const config = await db.query.storageConfig.findFirst();
    return config?.deleteLocalAfterTransfer === true;
  }

  async remove(remotePath: string): Promise<void> {
    assertSafePath(remotePath);
    const opts = await this.getConnectionOptions();
    if (!opts) return;
    const adapter = getAdapter(opts.protocol);
    return adapter.remove(remotePath, opts);
  }
}

export const remoteStorageService = new RemoteStorageService();
