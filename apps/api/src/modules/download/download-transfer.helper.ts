import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { logger } from "@/helpers/logger.helper";
import { resolveWithinDownloads } from "@/helpers/path.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";

const activeTransfers = new Set<string>();

export function isTransferInProgress(downloadId: string): boolean {
  return activeTransfers.has(downloadId);
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

    let mediaType: "movie" | "tv" | null = null;
    if (dl.mediaId) {
      const mediaRow = await db.query.media.findFirst({ where: eq(media.id, dl.mediaId) });
      mediaType = mediaRow?.type ?? null;
    }

    const remotePath = await remoteStorageService.resolveTransferPath(torrentName, mediaType);

    if (options?.replace) {
      const exists = await remoteStorageService.exists(remotePath);
      if (exists) {
        logger.info("TRANSFER", `Replacing existing remote path: ${remotePath}`);
        await remoteStorageService.remove(remotePath);
      }
    }

    await db
      .update(download)
      .set({
        torrent: {
          ...dl.torrent,
          transferring: true,
          transferProgress: 0,
          transferred: false,
        },
        error: null,
        storageLocation: "REMOTE",
      })
      .where(eq(download.id, downloadId));

    logger.info("TRANSFER", `Transferring to remote: ${remotePath}`);

    await remoteStorageService.transferDirectory(localPath, remotePath, async (progress) => {
      const current = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
      if (!current?.torrent) return;
      await db
        .update(download)
        .set({
          torrent: {
            ...current.torrent,
            transferring: true,
            transferProgress: progress,
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
            transferred: true,
            remotePath,
          },
          error: null,
          storageLocation: "REMOTE",
        })
        .where(eq(download.id, downloadId));
    }

    const shouldDeleteLocal =
      options?.isAutoTransfer === true && (await remoteStorageService.shouldDeleteLocalAfterTransfer());
    if (shouldDeleteLocal) {
      const fs = await import("node:fs/promises");
      await fs.rm(localPath, { recursive: true, force: true });
      logger.info("TRANSFER", `Deleted local files after transfer: ${torrentName}`);
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
    const message = error instanceof Error ? error.message : String(error);
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
