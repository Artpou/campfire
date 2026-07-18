export const storageProtocolEnum = ["ftp", "webdav"] as const;
export type StorageProtocol = (typeof storageProtocolEnum)[number];

export interface StorageConnectionOptions {
  protocol: StorageProtocol;
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  secure?: boolean;
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
}
