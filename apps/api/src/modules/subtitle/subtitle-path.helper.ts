import { isSubtitleFile } from "@seedarr/shared";

import { getDownloadFolderName, getDownloadsRoot, resolveWithinDownloads } from "@/shared/helpers/path.helper";

import type { Download } from "@/modules/download/download.schema";
import fs from "node:fs/promises";
import * as path from "node:path";

/** Absolute candidate paths for a subtitle file relative to DOWNLOADS_PATH / torrent folder. */
export function resolveSubtitleFileCandidates(download: Download, rawFilePath: string): string[] {
  const filePath = decodeURIComponent(rawFilePath);
  const candidates = [resolveWithinDownloads(filePath)];
  const folderName = getDownloadFolderName(download);
  if (folderName && !filePath.startsWith(`${folderName}/`) && filePath !== folderName) {
    candidates.push(resolveWithinDownloads(folderName, filePath));
  }
  return candidates;
}

/** List subtitle files on disk that are not already listed in torrent.files. */
export async function listExternalSubtitlePaths(download: Download): Promise<string[]> {
  const folderName = getDownloadFolderName(download);
  if (!folderName) return [];

  const downloadsRoot = getDownloadsRoot();
  const folderPath = resolveWithinDownloads(folderName);
  const torrentPaths = new Set(
    (download.torrent?.files ?? [])
      .filter((f) => isSubtitleFile(f.path))
      .map((f) => path.join(folderName, f.path).replace(/\\/g, "/")),
  );

  const collected: string[] = [];
  const scan = async (dir: string): Promise<void> => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(full);
        continue;
      }
      const rel = path.relative(downloadsRoot, full).replace(/\\/g, "/");
      if (isSubtitleFile(entry.name) && !torrentPaths.has(rel)) collected.push(rel);
    }
  };

  await scan(folderPath);
  return collected;
}
