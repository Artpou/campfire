import { pickLargestBySize, VIDEO_EXTENSIONS } from "@seedarr/shared";

import { assertWithinDownloads } from "@/shared/helpers/path.helper";

import fs from "node:fs/promises";
import path from "node:path";

export type LargestVideoFile = {
  filePath: string;
  fileName: string;
  size: number;
};

/**
 * Recursively find the largest video file under `rootDir`.
 * Paths are validated with `assertWithinDownloads`.
 */
export async function findLargestVideoInDirectory(rootDir: string): Promise<LargestVideoFile | null> {
  const entries = await fs.readdir(rootDir, { recursive: true, withFileTypes: true });
  const videos = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(entry.parentPath || rootDir, entry.name);
        assertWithinDownloads(filePath);
        const size = (await fs.stat(filePath)).size;
        return { filePath, fileName: entry.name, size };
      }),
  );
  return pickLargestBySize(videos, (v) => v.size) ?? null;
}

/** Pick largest video entry from an in-memory list (torrent files, remote listing…). */
export function pickLargestVideoFromEntries<T extends { name: string; length: number }>(files: T[]): T | undefined {
  const videos = files.filter((f) => VIDEO_EXTENSIONS.test(f.name));
  return pickLargestBySize(videos, (f) => f.length);
}
