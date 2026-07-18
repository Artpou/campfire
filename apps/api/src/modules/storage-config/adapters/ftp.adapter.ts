import { logger } from "@/helpers/logger.helper";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { PassThrough, Transform } from "node:stream";
import { StorageAdapter, type StorageConnectionOptions } from "./storage.adapter";

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
      .catch((err: unknown) => {
        sink.destroy(err instanceof Error ? err : new Error(String(err)));
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
