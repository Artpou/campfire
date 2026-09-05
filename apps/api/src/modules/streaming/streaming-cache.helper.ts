import { createCache } from "@/shared/helpers/cache.helper";

/** Resolved source metadata — cacheable (no open streams/handles). */
export interface StreamSourceInfo {
  size: number;
  fileName: string;
  filePath?: string;
  remotePath?: string;
  isRemote?: boolean;
  hasTorrentFile?: boolean;
}

const sourceCache = createCache<StreamSourceInfo>({
  max: 100,
  ttl: 5 * 60_000,
  name: "stream-source",
});

export function getCachedStreamSource(downloadId: string): StreamSourceInfo | undefined {
  return sourceCache.get(downloadId);
}

export function setCachedStreamSource(downloadId: string, info: StreamSourceInfo): void {
  sourceCache.set(downloadId, info);
}

/** Drop cached source after local/remote path changes (delete, transfer, torrent complete). */
export function invalidateStreamSource(downloadId: string): void {
  sourceCache.delete(downloadId);
}
