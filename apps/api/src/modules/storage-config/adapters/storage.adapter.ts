import type { StorageProtocol } from "@seedarr/contracts";

export type { StorageProtocol };

export interface StorageConnectionOptions {
  protocol: StorageProtocol;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  secure?: boolean;
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  length: number;
}

export interface RemoteDirectoryEntry {
  name: string;
  path: string;
  type: "file" | "directory";
}

export interface StorageDiskSpace {
  used: number;
  total: number;
  protocol: StorageProtocol;
}

export abstract class StorageAdapter {
  abstract testConnection(opts: StorageConnectionOptions): Promise<{ success: boolean; error?: string }>;
  abstract transferDirectory(
    localDir: string,
    remoteDir: string,
    opts: StorageConnectionOptions,
    onProgress?: (progress: number) => void,
  ): Promise<void>;
  abstract remove(remotePath: string, opts: StorageConnectionOptions): Promise<void>;
  abstract createReadStream(
    remotePath: string,
    opts: StorageConnectionOptions,
    range?: { start: number; end: number },
  ): Promise<{ stream: NodeJS.ReadableStream; size: number; cleanup?: () => void }>;
  abstract listFiles(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteFileEntry[]>;
  abstract listDirectories(remotePath: string, opts: StorageConnectionOptions): Promise<RemoteDirectoryEntry[]>;
  abstract moveFile(from: string, to: string, opts: StorageConnectionOptions): Promise<void>;
  abstract ensureDirectory(remotePath: string, opts: StorageConnectionOptions): Promise<void>;

  /** Optional — WebDAV quota, etc. Returns null when the server does not expose free space. */
  getDiskSpace(_opts: StorageConnectionOptions): Promise<StorageDiskSpace | null> {
    return Promise.resolve(null);
  }
}
