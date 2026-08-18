import { formatError, VIDEO_EXTENSIONS } from "@seedarr/shared";
import { eq } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { getDownloadFolderName, resolveWithinDownloads } from "@/shared/helpers/path.helper";
import { findLargestVideoInDirectory } from "@/shared/helpers/video-file.helper";

import { db } from "@/db/db";
import type { Download } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";
import { isFsNotFoundError, resolveRemoteVideoInfo } from "@/modules/streaming/streaming.helper";
import fs from "node:fs/promises";
import * as path from "node:path";

export type DownloadableFile = {
  fileName: string;
  size: number;
  filePath?: string;
  remotePath?: string;
};

/** Resolve a local seekable file on disk (single file or largest video in a folder). */
async function resolveLocalFile(item: Download): Promise<{ filePath: string; fileName: string; size: number } | null> {
  const folderName = getDownloadFolderName(item);
  if (!folderName) return null;

  const fullPath = resolveWithinDownloads(folderName);
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isFile()) return { filePath: fullPath, fileName: path.basename(fullPath), size: stats.size };

    const largest = await findLargestVideoInDirectory(fullPath);
    if (!largest) return { filePath: fullPath, fileName: folderName, size: 0 };
    return { filePath: largest.filePath, fileName: largest.fileName, size: largest.size };
  } catch (error) {
    if (isFsNotFoundError(error)) return { filePath: fullPath, fileName: folderName, size: 0 };
    throw error;
  }
}

/** Verify a remote video actually exists and is readable (list + size > 0). */
async function resolveReadableRemoteFile(item: Download): Promise<DownloadableFile | null> {
  if (!item.remoteLocation) return null;

  try {
    const info = await resolveRemoteVideoInfo(item, item.remoteLocation);
    if (!info) return null;

    const files = await remoteStorageService.listFiles(item.remoteLocation);
    const videos = files
      .filter((f) => VIDEO_EXTENSIONS.test(f.name) && f.length > 0)
      .sort((a, b) => b.length - a.length);
    const matched =
      videos.find(
        (f) => f.name === info.fileName || info.remotePath.endsWith(`/${f.path}`) || info.remotePath.endsWith(f.name),
      ) ?? videos[0];

    if (!matched) return null;

    const remotePath = VIDEO_EXTENSIONS.test(item.remoteLocation.split("/").pop() ?? "")
      ? item.remoteLocation
      : `${item.remoteLocation.replace(/\/+$/, "")}/${matched.path}`.replace(/\/+/g, "/");

    return { fileName: matched.name, size: matched.length, remotePath };
  } catch (error) {
    logger.warn("DOWNLOAD", `Remote file verify failed for ${item.id}: ${formatError(error)}`);
    return null;
  }
}

/**
 * Resolve a downloadable attachment by id.
 * Prefers a verified remote file, otherwise a completed local torrent file.
 */
export async function getDownloadableFile(id: string): Promise<DownloadableFile> {
  const item = await db.query.download.findFirst({ where: eq(download.id, id) });
  if (!item) throw new NotFoundError("Download");

  const remote = await resolveReadableRemoteFile(item);
  if (remote) return remote;

  const local = await resolveLocalFile(item);
  if (local && local.size > 0) return { fileName: local.fileName, size: local.size, filePath: local.filePath };

  throw new NotFoundError("Downloadable file");
}
