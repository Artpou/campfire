import { logger } from "@/helpers/logger.helper";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { StorageAdapter, type StorageConnectionOptions } from "./storage.adapter";

export class FtpAdapter extends StorageAdapter {
  private async createClient(opts: StorageConnectionOptions) {
    const { Client } = await import("basic-ftp");
    const client = new Client();
    await client.access({
      host: opts.host,
      port: opts.port,
      user: opts.username || undefined,
      password: opts.password || undefined,
      secure: opts.secure ?? false,
    });
    return client;
  }

  private buildRemotePath(...segments: string[]): string {
    const joined = segments.filter(Boolean).join("/").replace(/^\/+/, "").replace(/\/+/g, "/");
    return joined ? `/${joined}` : "/";
  }

  async testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.createClient(opts);
      await client.list("/");
      client.close();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("FTP", `Connection test failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async exists(remotePath: string, opts: StorageConnectionOptions): Promise<boolean> {
    const client = await this.createClient(opts);
    try {
      const fullPath = this.buildRemotePath(remotePath);
      const parent = path.posix.dirname(fullPath);
      const name = path.posix.basename(fullPath);
      const items = await client.list(parent);
      return items.some((item) => item.name === name);
    } catch {
      return false;
    } finally {
      client.close();
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

    const client = await this.createClient(opts);
    try {
      for (const file of files) {
        const fullRemotePath = this.buildRemotePath(file.remote);
        const remoteParent = path.posix.dirname(fullRemotePath);
        await client.ensureDir(remoteParent);
        await client.cd("/");

        client.trackProgress((info) => {
          if (!onProgress || totalSize <= 0) return;
          const current = transferred + info.bytes;
          onProgress(Math.min(current / totalSize, 0.99));
        });

        await client.uploadFrom(createReadStream(file.local), fullRemotePath);
        client.trackProgress();
        transferred += file.size;
      }
      onProgress?.(1);
    } finally {
      client.close();
    }
  }

  async remove(remotePath: string, opts: StorageConnectionOptions): Promise<void> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);
    try {
      await client.remove(fullPath);
    } catch {
      try {
        await client.removeDir(fullPath);
      } catch {
        logger.warn("FTP", `Could not remove: ${fullPath}`);
      }
    } finally {
      client.close();
    }
  }
}
