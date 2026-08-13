import fs from "node:fs/promises";
import path from "node:path";

export interface LocalDiskSpace {
  used: number;
  total: number;
}

/** Disk usage for the filesystem that contains `dirPath` (creates the dir if missing). */
export async function getLocalDiskSpace(dirPath: string): Promise<LocalDiskSpace | null> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const resolved = path.resolve(dirPath);
    const stats = await fs.statfs(resolved);
    const total = stats.blocks * stats.bsize;
    const free = stats.bavail * stats.bsize;
    return { used: Math.max(0, total - free), total };
  } catch {
    return null;
  }
}
