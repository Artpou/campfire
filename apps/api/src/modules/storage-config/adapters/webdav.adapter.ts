import { logger } from "@/helpers/logger.helper";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { StorageAdapter, type StorageConnectionOptions } from "./storage.adapter";

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
      const message = error instanceof Error ? error.message : String(error);
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
      const message = error instanceof Error ? error.message : String(error);
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
    const nodeStream =
      webdavStream instanceof Readable ? webdavStream : Readable.from(webdavStream as AsyncIterable<unknown>);

    return {
      stream: nodeStream,
      size: range ? range.end - range.start + 1 : totalSize,
    };
  }
}
