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
  abstract exists(remotePath: string, opts: StorageConnectionOptions): Promise<boolean>;
  abstract transferDirectory(
    localDir: string,
    remoteDir: string,
    opts: StorageConnectionOptions,
    onProgress?: (progress: number) => void,
  ): Promise<void>;
  abstract remove(remotePath: string, opts: StorageConnectionOptions): Promise<void>;
}
