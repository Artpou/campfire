import { formatError } from "@seedarr/shared";

import { logger } from "@/shared/helpers/logger.helper";

import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  type RemoteDirectoryEntry,
  type RemoteFileEntry,
  StorageAdapter,
  type StorageConnectionOptions,
  type StorageDiskSpace,
} from "./storage.adapter";

export class WebdavAdapter extends StorageAdapter {
  private async createClient(opts: StorageConnectionOptions) {
    const { createClient } = await import("webdav");
    const scheme = opts.secure ? "https" : "http";
    const baseUrl = `${scheme}://${opts.host}:${opts.port}`;

    return createClient(baseUrl, {
      username: opts.username || undefined,
      password: opts.password || undefined,
    });
  }

  private buildRemotePath(...segments: string[]): string {
    const joined = segments.filter(Boolean).join("/").replace(/^\/+/, "").replace(/\/+/g, "/");
    return joined ? `/${joined}` : "/";
  }

  async testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.createClient(opts);
      await client.getDirectoryContents("/");
      return { success: true };
    } catch (error) {
      const message = formatError(error);
      logger.error("WEBDAV", `Connection test failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async transferDirectory(
    localDir: string,
    remoteDir: string,
    opts: StorageConnectionOptions,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    const files: { local: string; remote: string; size: number }[] = [];
    const stats = await fs.stat(localDir);

    if (stats.isFile()) {
      files.push({ local: localDir, remote: remoteDir, size: stats.size });
    } else {
      const entries = await fs.readdir(localDir, { withFileTypes: true, recursive: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const localFile = path.join(entry.parentPath || localDir, entry.name);
        const relativePath = path.relative(localDir, localFile).replace(/\\/g, "/");
        const fileStats = await fs.stat(localFile);
        files.push({
          local: localFile,
          remote: path.posix.join(remoteDir, relativePath),
          size: fileStats.size,
        });
      }
    }

    if (files.length === 0) throw new Error("No files to transfer");

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    let transferred = 0;
    let lastReportAt = 0;

    const reportProgress = (): void => {
      if (!onProgress || totalSize <= 0) return;
      const now = Date.now();
      if (now - lastReportAt < 500 && transferred < totalSize) return;
      lastReportAt = now;
      onProgress(Math.min(transferred / totalSize, 1));
    };

    const client = await this.createClient(opts);
    try {
      for (const file of files) {
        const fullRemotePath = this.buildRemotePath(file.remote);
        const remoteParent = path.posix.dirname(fullRemotePath);

        try {
          await client.createDirectory(remoteParent, { recursive: true });
        } catch {
          // directory may already exist
        }

        const fileBuffer = await fs.readFile(file.local);
        await client.putFileContents(fullRemotePath, fileBuffer, {
          overwrite: true,
          contentLength: file.size,
        });

        transferred += file.size;
        reportProgress();
      }
      onProgress?.(1);
    } catch (error) {
      const message = formatError(error);
      throw new Error(`WebDAV transfer failed: ${message}`);
    }
  }

  async remove(remotePath: string, opts: StorageConnectionOptions): Promise<void> {
    try {
      const client = await this.createClient(opts);
      const fullPath = this.buildRemotePath(remotePath);
      await client.deleteFile(fullPath);
    } catch {
      logger.warn("WEBDAV", `Could not remove: ${remotePath}`);
    }
  }

  async listFiles(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteFileEntry[]> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);
    const results: RemoteFileEntry[] = [];

    const rawStat = await client.stat(fullPath);
    const stat = "data" in rawStat ? rawStat.data : rawStat;

    if (stat.type === "file") {
      const name = path.posix.basename(fullPath);
      results.push({ name, path: name, length: stat.size });
      return results;
    }

    const collect = async (dir: string, prefix: string): Promise<void> => {
      const raw = await client.getDirectoryContents(dir);
      const entries = Array.isArray(raw) ? raw : (raw as { data: typeof raw }).data;

      for (const entry of entries) {
        const entryName = path.posix.basename(entry.filename);
        const entryPath = prefix ? `${prefix}/${entryName}` : entryName;

        if (entry.type === "directory") {
          await collect(entry.filename, entryPath);
        } else {
          results.push({ name: entryName, path: entryPath, length: entry.size });
        }
      }
    };

    await collect(fullPath, "");
    return results;
  }

  async listDirectories(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteDirectoryEntry[]> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);

    const raw = await client.getDirectoryContents(fullPath);
    const entries = Array.isArray(raw) ? raw : (raw as { data: typeof raw }).data;

    return entries.map((entry) => ({
      name: path.posix.basename(entry.filename),
      path: path.posix.basename(entry.filename),
      type: (entry.type === "directory" ? "directory" : "file") as "file" | "directory",
    }));
  }

  async moveFile(from: string, to: string, opts: StorageConnectionOptions): Promise<void> {
    const client = await this.createClient(opts);
    const fullFrom = this.buildRemotePath(from);
    const fullTo = this.buildRemotePath(to);
    await client.moveFile(fullFrom, fullTo);
  }

  async ensureDirectory(remotePath: string, opts: StorageConnectionOptions): Promise<void> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);
    try {
      await client.createDirectory(fullPath, { recursive: true });
    } catch {
      // directory may already exist
    }
  }

  async getDiskSpace(opts: StorageConnectionOptions): Promise<StorageDiskSpace | null> {
    try {
      const client = await this.createClient(opts);
      const raw = await client.getQuota();
      const quota = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
      if (!quota || typeof quota.used !== "number") return null;
      if (typeof quota.available !== "number") return null;
      return {
        used: quota.used,
        total: quota.used + quota.available,
        protocol: "webdav",
      };
    } catch (error) {
      logger.warn("WEBDAV", `Disk space unavailable: ${formatError(error)}`);
      return null;
    }
  }

  async createReadStream(
    remotePath: string,
    opts: StorageConnectionOptions,
    range?: { start: number; end: number },
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; cleanup?: () => void }> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);

    const rawStat = await client.stat(fullPath);
    const stat = "data" in rawStat ? rawStat.data : rawStat;
    const totalSize = stat.size;

    const headers: Record<string, string> = {};
    if (range) {
      headers.Range = `bytes=${range.start}-${range.end}`;
    }

    const webdavStream = client.createReadStream(fullPath, { headers });
    const nodeStream = webdavStream instanceof Readable ? webdavStream : Readable.from(webdavStream);

    return {
      stream: nodeStream,
      size: range ? range.end - range.start + 1 : totalSize,
    };
  }
}
