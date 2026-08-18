import { createCache } from "@/shared/helpers/cache.helper";

import { db } from "@/db/db";
import path from "node:path";
import { decrypt } from "../../../shared/helpers/crypto.helper";
import { FtpAdapter } from "../adapters/ftp.adapter";
import type {
  RemoteDirectoryEntry,
  RemoteFileEntry,
  StorageAdapter,
  StorageConnectionOptions,
  StorageDiskSpace,
  StorageProtocol,
} from "../adapters/storage.adapter";
import { WebdavAdapter } from "../adapters/webdav.adapter";

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
  autoTransfer: boolean;
  moviePath: string;
  tvPath: string;
  deleteLocalAfterTransfer: boolean;
  diskQuotaGb: number | null;
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

  const { ensureSystemModules } = await import("@/modules/module/module.seed");
  const { module } = await import("@/modules/module/module.schema");
  const { eq } = await import("drizzle-orm");

  await ensureSystemModules();
  const storageModule = await db.query.module.findFirst({
    where: eq(module.category, "storage"),
  });

  if (storageModule) {
    const cfg = storageModule.config as {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      secure?: boolean;
      moviePath?: string;
      tvPath?: string;
      autoTransfer?: boolean;
      deleteLocalAfterTransfer?: boolean;
      diskQuotaGb?: number;
    };
    const protocol = storageModule.type === "webdav" ? "webdav" : "ftp";
    const result: StorageConfigFull = {
      connectionOptions: cfg.host
        ? {
            protocol,
            host: cfg.host,
            port: cfg.port ?? (protocol === "webdav" ? 443 : 21),
            username: cfg.username ?? null,
            password: cfg.password
              ? (() => {
                  try {
                    return decrypt(cfg.password);
                  } catch {
                    return cfg.password;
                  }
                })()
              : null,
            secure: cfg.secure ?? false,
          }
        : null,
      enabled: storageModule.enabled === true,
      autoTransfer: cfg.autoTransfer === true,
      moviePath: normalizeBasePath(cfg.moviePath),
      tvPath: normalizeBasePath(cfg.tvPath),
      deleteLocalAfterTransfer: cfg.deleteLocalAfterTransfer === true,
      diskQuotaGb: cfg.diskQuotaGb ?? null,
    };
    configCache.set(CONFIG_CACHE_KEY, result);
    return result;
  }

  const empty: StorageConfigFull = {
    connectionOptions: null,
    enabled: false,
    autoTransfer: false,
    moviePath: "",
    tvPath: "",
    deleteLocalAfterTransfer: false,
    diskQuotaGb: null,
  };
  configCache.set(CONFIG_CACHE_KEY, empty);
  return empty;
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

  async isAutoTransferEnabled(): Promise<boolean> {
    const config = await loadConfig();
    return config.enabled && config.autoTransfer;
  }

  async getProtocol(): Promise<StorageProtocol | null> {
    const config = await loadConfig();
    return config.connectionOptions?.protocol ?? null;
  }

  async getDiskQuotaBytes(): Promise<number | null> {
    const config = await loadConfig();
    if (config.diskQuotaGb == null || config.diskQuotaGb <= 0) return null;
    return config.diskQuotaGb * 1024 * 1024 * 1024;
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

  async getMediaPaths(): Promise<{ moviePath: string; tvPath: string }> {
    const config = await loadConfig();
    return { moviePath: config.moviePath, tvPath: config.tvPath };
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

  async getDiskSpace(): Promise<StorageDiskSpace | null> {
    const fromAdapter = await this.withAdapter(null, (adapter, opts) => adapter.getDiskSpace(opts));
    if (fromAdapter) return fromAdapter;

    const config = await loadConfig();
    if (!config.enabled || !config.connectionOptions) return null;
    const quotaBytes = await this.getDiskQuotaBytes();
    if (quotaBytes == null) return null;

    return {
      used: 0,
      total: quotaBytes,
      protocol: config.connectionOptions.protocol,
    };
  }
}

export const remoteStorageService = new RemoteStorageService();
