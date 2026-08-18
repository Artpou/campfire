import { formatError } from "@seedarr/shared";
import { eq } from "drizzle-orm";

import { logger } from "@/shared/helpers/logger.helper";
import { resolveWithinDownloads } from "@/shared/helpers/path.helper";

import { db } from "@/db/db";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";
import { invalidateStreamSource } from "@/modules/streaming/streaming.service";
import { waitUntilNoStreams } from "@/modules/streaming/streaming-lease";
import fs from "node:fs/promises";
import { torrentClient, UNMARK_DESTROYING_DELAY_MS } from "../webtorrent/webtorrent-manager";

const activeTransfers = new Set<string>();

export function isTransferInProgress(downloadId: string): boolean {
  return activeTransfers.has(downloadId);
}

async function resolveMediaType(mediaId: number | null | undefined): Promise<"movie" | "tv" | null> {
  if (!mediaId) return null;
  const mediaRow = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
  return mediaRow?.type ?? null;
}

/** Tear down any in-memory WebTorrent session for this download (files may already be gone). */
function unloadTorrentSession(downloadId: string): void {
  const active = torrentClient.getActiveTorrent(downloadId);
  if (!active) return;

  torrentClient.markDestroying(downloadId);
  torrentClient.deleteActiveTorrent(downloadId);
  try {
    active.destroy({ destroyStore: false });
  } catch {
    // already destroyed
  }
  setTimeout(() => torrentClient.unmarkDestroying(downloadId), UNMARK_DESTROYING_DELAY_MS);
}

/** Mark transfer started in DB so the UI can poll immediately (auto + manual). */
export async function markTransferStarting(downloadId: string): Promise<void> {
  const dl = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
  if (!dl?.torrent) return;

  await db
    .update(download)
    .set({
      torrent: {
        ...dl.torrent,
        transferring: true,
        transferProgress: 0,
      },
      error: null,
    })
    .where(eq(download.id, downloadId));
}

export async function runRemoteTransfer(
  downloadId: string,
  options?: { replace?: boolean; isAutoTransfer?: boolean },
): Promise<void> {
  if (activeTransfers.has(downloadId)) {
    throw new Error("Transfer already in progress");
  }

  activeTransfers.add(downloadId);

  try {
    const dl = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
    if (!dl?.torrent?.name) throw new Error("Download not found or has no torrent name");
    if (!dl.torrent.done) throw new Error("Download is not complete");

    const torrentName = dl.torrent.name;
    const localPath = resolveWithinDownloads(torrentName);
    const userId = dl.userId;

    const mediaType = await resolveMediaType(dl.mediaId);
    const remotePath = await remoteStorageService.resolveTransferPath(torrentName, mediaType);

    if (!dl.torrent.transferring) {
      await markTransferStarting(downloadId);
    }

    if (options?.replace || dl.remoteLocation) {
      logger.info("TRANSFER", `Replacing existing remote path: ${remotePath}`);
      await remoteStorageService.remove(remotePath);
    }

    logger.info("TRANSFER", `Transferring to remote: ${remotePath}`);

    const totalSize = dl.torrent.length ?? 0;
    let lastProgressAt = Date.now();
    let lastProgressBytes = 0;

    await remoteStorageService.transferDirectory(localPath, remotePath, async (progress) => {
      const current = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
      if (!current?.torrent) return;

      const now = Date.now();
      const elapsed = (now - lastProgressAt) / 1000;
      const currentBytes = progress * totalSize;
      const speed = elapsed > 0 ? (currentBytes - lastProgressBytes) / elapsed : 0;
      lastProgressAt = now;
      lastProgressBytes = currentBytes;

      await db
        .update(download)
        .set({
          torrent: {
            ...current.torrent,
            transferring: true,
            transferProgress: progress,
            transferSpeed: Math.max(0, Math.round(speed)),
          },
        })
        .where(eq(download.id, downloadId));
    });

    const after = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
    if (after?.torrent) {
      await db
        .update(download)
        .set({
          torrent: {
            ...after.torrent,
            transferring: false,
            transferProgress: 1,
          },
          remoteLocation: remotePath,
          error: null,
        })
        .where(eq(download.id, downloadId));
    }

    invalidateStreamSource(downloadId);
    logger.info("TRANSFER", `Transfer complete: ${torrentName} -> ${remotePath}`);

    const shouldDeleteLocal =
      options?.isAutoTransfer === true && (await remoteStorageService.shouldDeleteLocalAfterTransfer());
    if (shouldDeleteLocal) {
      // Wait until playback finishes so we don't delete under an open stream.
      await waitUntilNoStreams(downloadId);
      unloadTorrentSession(downloadId);
      await fs.rm(localPath, { recursive: true, force: true });
      // Drop torrent metadata — local source is gone; remoteLocation is the source of truth.
      await db.update(download).set({ torrent: null }).where(eq(download.id, downloadId));
      logger.info("TRANSFER", `Deleted local files and cleared torrent data: ${torrentName}`);
    } else {
      logger.info("TRANSFER", `Kept local files after transfer: ${torrentName}`);
    }

    ActivityLogService.log({
      userId,
      type: "SUCCESS",
      action: "DOWNLOAD_TRANSFERRED",
      title: `Download transferred to remote: ${torrentName}`,
      metadata: { downloadId, remotePath },
    });
  } catch (error) {
    const message = formatError(error);
    logger.error("TRANSFER", `Remote transfer failed for "${downloadId}": ${message}`);

    const dl = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
    if (dl?.torrent) {
      await db
        .update(download)
        .set({
          torrent: {
            ...dl.torrent,
            transferring: false,
            transferProgress: undefined,
          },
          error: `Remote transfer failed: ${message}`,
        })
        .where(eq(download.id, downloadId));
    }

    ActivityLogService.log({
      userId: dl?.userId,
      type: "ERROR",
      action: "DOWNLOAD_TRANSFERRED",
      title: `Remote transfer failed: ${dl?.torrent?.name ?? downloadId}`,
      metadata: { downloadId, error: message },
    });

    throw error;
  } finally {
    activeTransfers.delete(downloadId);
  }
}
