import { createCache } from "@/shared/helpers/cache.helper";

import { db } from "@/db/db";
import path from "node:path";
import { FtpAdapter } from "./adapters/ftp.adapter";
import type {
  RemoteDirectoryEntry,
  RemoteFileEntry,
  StorageAdapter,
  StorageConnectionOptions,
  StorageProtocol,
} from "./adapters/storage.adapter";
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

interface StorageConfigFull {
  connectionOptions: StorageConnectionOptions | null;
  enabled: boolean;
  moviePath: string;
  tvPath: string;
  deleteLocalAfterTransfer: boolean;
}

const CONFIG_CACHE_KEY = "config";

const configCache = createCache<StorageConfigFull>({
  max: 1,
  ttl: 60_000,
  name: "storage-config",
});

export function invalidateStorageConfigCache(): void {
  configCache.clear();
}

async function loadConfig(): Promise<StorageConfigFull> {
  const cached = configCache.get(CONFIG_CACHE_KEY);
  if (cached) return cached;

  const config = await db.query.storageConfig.findFirst();

  const result: StorageConfigFull = {
    connectionOptions: config?.host
      ? {
          protocol: config.protocol,
          host: config.host,
          port: config.port ?? 21,
          username: config.username,
          password: config.password ? decrypt(config.password) : null,
          secure: config.secure ?? false,
        }
      : null,
    enabled: config?.enabled === true,
    moviePath: normalizeBasePath(config?.moviePath),
    tvPath: normalizeBasePath(config?.tvPath),
    deleteLocalAfterTransfer: config?.deleteLocalAfterTransfer === true,
  };

  configCache.set(CONFIG_CACHE_KEY, result);
  return result;
}

class RemoteStorageService {
  private async withAdapter<T>(
    fallback: T,
    fn: (adapter: StorageAdapter, opts: StorageConnectionOptions) => Promise<T>,
  ): Promise<T> {
    const opts = await this.getConnectionOptions();
    if (!opts) return fallback;
    return fn(getAdapter(opts.protocol), opts);
  }

  private async withRequiredAdapter<T>(
    fn: (adapter: StorageAdapter, opts: StorageConnectionOptions) => Promise<T>,
  ): Promise<T> {
    const opts = await this.getConnectionOptions();
    if (!opts) throw new Error("Remote storage is not configured");
    return fn(getAdapter(opts.protocol), opts);
  }

  async getConnectionOptions(): Promise<StorageConnectionOptions | null> {
    const config = await loadConfig();
    return config.connectionOptions;
  }

  async resolveTransferPath(torrentName: string, mediaType?: "movie" | "tv" | null): Promise<string> {
    const config = await loadConfig();
    const basePath = mediaType === "tv" ? config.tvPath : config.moviePath;
    return basePath ? path.posix.join(basePath, torrentName) : torrentName;
  }

  async isEnabled(): Promise<boolean> {
    const config = await loadConfig();
    return config.enabled;
  }

  async isAvailable(): Promise<boolean> {
    try {
      return await this.withAdapter(false, async (adapter, opts) => {
        const result = await adapter.testConnection(opts);
        return result.success;
      });
    } catch {
      return false;
    }
  }

  async testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }> {
    return getAdapter(opts.protocol).testConnection(opts);
  }

  async transferDirectory(localDir: string, remoteDir: string, onProgress?: (progress: number) => void): Promise<void> {
    assertSafePath(remoteDir);
    return this.withRequiredAdapter((adapter, opts) =>
      adapter.transferDirectory(localDir, remoteDir, opts, onProgress),
    );
  }

  async shouldDeleteLocalAfterTransfer(): Promise<boolean> {
    const config = await loadConfig();
    return config.deleteLocalAfterTransfer;
  }

  async remove(remotePath: string): Promise<void> {
    assertSafePath(remotePath);
    return this.withAdapter(undefined, (adapter, opts) => adapter.remove(remotePath, opts));
  }

  async listDirectories(remotePath: string): Promise<RemoteDirectoryEntry[]> {
    assertSafePath(remotePath);
    return this.withAdapter([], (adapter, opts) => adapter.listDirectories(remotePath, opts));
  }

  async listFiles(remotePath: string): Promise<RemoteFileEntry[]> {
    assertSafePath(remotePath);
    return this.withAdapter([], (adapter, opts) => adapter.listFiles(remotePath, opts));
  }

  async moveFile(from: string, to: string): Promise<void> {
    assertSafePath(from);
    assertSafePath(to);
    return this.withRequiredAdapter((adapter, opts) => adapter.moveFile(from, to, opts));
  }

  async ensureDirectory(remotePath: string): Promise<void> {
    assertSafePath(remotePath);
    return this.withRequiredAdapter((adapter, opts) => adapter.ensureDirectory(remotePath, opts));
  }

  async createReadStream(
    remotePath: string,
    range?: { start: number; end: number },
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; cleanup?: () => void } | null> {
    assertSafePath(remotePath);
    return this.withAdapter(null, (adapter, opts) => adapter.createReadStream(remotePath, opts, range));
  }
}

export const remoteStorageService = new RemoteStorageService();
