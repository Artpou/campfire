import { formatError } from "@seedarr/shared";

import { logger } from "@/helpers/logger.helper";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PassThrough, Transform } from "node:stream";
import {
  type RemoteDirectoryEntry,
  type RemoteFileEntry,
  StorageAdapter,
  type StorageConnectionOptions,
} from "./storage.adapter";

const VIDEO_EXT_RE = /\.(mkv|mp4|avi|m4v|mov|wmv|flv|webm|ts|m2ts|mpg|mpeg)$/i;

function hasVideoExtension(name: string): boolean {
  return VIDEO_EXT_RE.test(name);
}

function createByteLimiter(maxBytes: number): Transform {
  let remaining = maxBytes;
  return new Transform({
    transform(chunk, _encoding, callback) {
      if (remaining <= 0) {
        callback();
        return;
      }
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (buf.length <= remaining) {
        remaining -= buf.length;
        callback(null, buf);
        if (remaining === 0) this.push(null);
        return;
      }
      const slice = buf.subarray(0, remaining);
      remaining = 0;
      callback(null, slice);
      this.push(null);
    },
  });
}

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
    // Freebox (and similar embedded FTP) often returns empty listings for `LIST -a`.
    // Prefer plain LIST / NLST after connect.
    client.availableListCommands = ["LIST", "NLST"];
    return client;
  }

  private buildRemotePath(...segments: string[]): string {
    const joined = segments.filter(Boolean).join("/").replace(/^\/+/, "").replace(/\/+/g, "/");
    return joined ? `/${joined}` : "/";
  }

  /** CD into path then LIST cwd — Freebox ignores/breaks LIST with an absolute path argument. */
  private async listCwd(client: Awaited<ReturnType<FtpAdapter["createClient"]>>, remotePath: string) {
    const fullPath = this.buildRemotePath(remotePath);
    await client.cd(fullPath);
    const entries = await client.list();
    await client.cd("/");
    return entries;
  }

  async testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const client = await this.createClient(opts);
      await client.cd("/");
      await client.list();
      client.close();
      return { success: true };
    } catch (error) {
      const message = formatError(error);
      logger.error("FTP", `Connection test failed: ${message}`);
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

  async listFiles(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteFileEntry[]> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);
    const results: RemoteFileEntry[] = [];

    try {
      const stat = await client.size(fullPath).catch(() => -1);
      if (stat >= 0) {
        const name = path.posix.basename(fullPath);
        results.push({ name, path: name, length: stat });
        return results;
      }

      const collect = async (dir: string, prefix: string): Promise<void> => {
        await client.cd(dir);
        const entries = await client.list();
        for (const entry of entries) {
          if (!entry.name || entry.name === "." || entry.name === "..") continue;
          const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          const isDir = entry.isDirectory || (!entry.isFile && !hasVideoExtension(entry.name));
          if (isDir) {
            await collect(path.posix.join(dir, entry.name), entryPath);
          } else {
            results.push({ name: entry.name, path: entryPath, length: entry.size });
          }
        }
        // Return to parent so siblings resolve correctly after nested cds.
        await client.cd(dir);
      };

      await collect(fullPath, "");
    } finally {
      client.close();
    }

    return results;
  }

  async listDirectories(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteDirectoryEntry[]> {
    const client = await this.createClient(opts);

    try {
      const entries = await this.listCwd(client, remotePath);
      logger.info(
        "FTP",
        `listDirectories("${remotePath}"): ${entries.length} raw entries — ${entries
          .slice(0, 20)
          .map((e) => `${e.name}[dir=${e.isDirectory},file=${e.isFile}]`)
          .join(", ")}`,
      );

      return entries
        .filter((entry) => entry.name && entry.name !== "." && entry.name !== "..")
        .map((entry) => {
          const isDir = entry.isDirectory || (!entry.isFile && !hasVideoExtension(entry.name));
          return {
            name: entry.name,
            path: entry.name,
            type: (isDir ? "directory" : "file") as "file" | "directory",
          };
        });
    } finally {
      client.close();
    }
  }

  async moveFile(from: string, to: string, opts: StorageConnectionOptions): Promise<void> {
    const client = await this.createClient(opts);
    try {
      const fullFrom = this.buildRemotePath(from);
      const fullTo = this.buildRemotePath(to);
      await client.rename(fullFrom, fullTo);
    } finally {
      client.close();
    }
  }

  async ensureDirectory(remotePath: string, opts: StorageConnectionOptions): Promise<void> {
    const client = await this.createClient(opts);
    try {
      const fullPath = this.buildRemotePath(remotePath);
      await client.ensureDir(fullPath);
      await client.cd("/");
    } finally {
      client.close();
    }
  }

  async createReadStream(
    remotePath: string,
    opts: StorageConnectionOptions,
    range?: { start: number; end: number },
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; cleanup?: () => void }> {
    const client = await this.createClient(opts);
    const fullPath = this.buildRemotePath(remotePath);
    const size = await client.size(fullPath);

    const sink = new PassThrough();
    const output = range ? sink.pipe(createByteLimiter(range.end - range.start + 1)) : sink;
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      try {
        client.close();
      } catch {}
    };

    const downloadPromise = range ? client.downloadTo(sink, fullPath, range.start) : client.downloadTo(sink, fullPath);

    downloadPromise
      .then(() => {
        if (!sink.writableEnded) sink.end();
        cleanup();
      })
      .catch(() => {
        if (!sink.destroyed && !sink.writableEnded) sink.end();
        cleanup();
      });

    output.on("close", cleanup);
    output.on("end", cleanup);

    return {
      stream: output,
      size: range ? range.end - range.start + 1 : size,
      cleanup,
    };
  }
}
