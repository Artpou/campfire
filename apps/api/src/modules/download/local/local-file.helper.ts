import { formatError, VIDEO_EXTENSIONS } from "@seedarr/shared";
import { eq } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { assertWithinDownloads, resolveWithinDownloads } from "@/shared/helpers/path.helper";

import { db } from "@/db/db";
import type { Download } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import { isFsNotFoundError, resolveRemoteVideoInfo } from "@/modules/streaming/streaming.helper";
import fs from "node:fs/promises";
import * as path from "node:path";
import { torrentClient } from "../webtorrent/webtorrent-manager";

export type DownloadableFile = {
  fileName: string;
  size: number;
  filePath?: string;
  remotePath?: string;
};

/** Resolve a local seekable file on disk (single file or largest video in a folder). */
async function resolveLocalFile(item: Download): Promise<{ filePath: string; fileName: string; size: number }> {
  const fullPath = resolveWithinDownloads(item.torrent?.name ?? "");
  try {
    const stats = await fs.stat(fullPath);
    if (stats.isFile()) return { filePath: fullPath, fileName: path.basename(fullPath), size: stats.size };

    const files = await fs.readdir(fullPath, { recursive: true, withFileTypes: true });
    const mediaFiles = await Promise.all(
      files
        .filter((file) => file.isFile() && VIDEO_EXTENSIONS.test(file.name))
        .map(async (file) => {
          const filePath = path.join(file.parentPath || fullPath, file.name);
          assertWithinDownloads(filePath);
          const fileStats = await fs.stat(filePath);
          return { filePath, name: file.name, size: fileStats.size };
        }),
    );
    if (mediaFiles.length === 0) return { filePath: fullPath, fileName: item.torrent?.name ?? "download", size: 0 };
    const largest = mediaFiles.sort((a, b) => b.size - a.size)[0];
    return { filePath: largest.filePath, fileName: largest.name, size: largest.size };
  } catch (error) {
    if (isFsNotFoundError(error)) return { filePath: fullPath, fileName: item.torrent?.name ?? "download", size: 0 };
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

  if (item.torrent?.done) {
    const local = await resolveLocalFile(item);
    if (local.size > 0) return { fileName: local.fileName, size: local.size, filePath: local.filePath };
  }

  throw new NotFoundError("Downloadable file");
}

/** True when an in-progress torrent can be streamed (active session or known video files). */
function canStreamActiveTorrent(item: Download): boolean {
  if (!item.torrent || item.torrent.done || item.torrent.paused) return false;

  const active = torrentClient.resolveTorrent(item.id, item.torrent.infoHash);
  if (active) return true;

  return (item.torrent.files ?? []).some((f) => VIDEO_EXTENSIONS.test(f.name));
}

/**
 * Ensure a file can actually be read for playback/download:
 * verified remote video, completed local video on disk, or streamable active torrent.
 */
export async function checkFileAvailability(downloadId: string): Promise<boolean> {
  const item = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
  if (!item) return false;

  const remote = await resolveReadableRemoteFile(item);
  if (remote && remote.size > 0) return true;

  if (item.torrent?.done) {
    try {
      const local = await resolveLocalFile(item);
      return local.size > 0;
    } catch {
      return false;
    }
  }

  return canStreamActiveTorrent(item);
}
