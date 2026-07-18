import { and, eq, inArray } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { resolveWithinDownloads } from "@/helpers/path.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import { resolveTorrentSource } from "@/modules/torrent/torrent-source.helper";
import fs from "node:fs/promises";
import type {
  Download,
  DownloadStats,
  DownloadTorrentInput,
  TorrentLiveData,
  TransferDownloadInput,
} from "./download.dto";
import { isTransferInProgress, runRemoteTransfer } from "./download-transfer.helper";
import { waitForTorrentMetadata } from "./torrent-ready.helper";
import { torrentClient } from "./webtorrent.client";
import { extractTorrentLiveData } from "./webtorrent.helper";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";

function destroyTorrent(torrent: WebTorrent.Torrent, opts: { destroyStore: boolean }): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      torrent.destroy(opts, () => resolve());
    } catch {
      resolve();
    }
  });
}

export class DownloadService extends IdentifiableService<Download> {
  async getMany(params?: { ids?: string[] }): Promise<Download[]> {
    return await db.query.download.findMany({
      where: and(eq(download.userId, this.user.id), params?.ids ? inArray(download.id, params.ids) : undefined),
    });
  }

  async getStats(): Promise<DownloadStats> {
    const downloads = await db.query.download.findMany({
      where: eq(download.userId, this.user.id),
    });

    let totalSize = 0;
    let downloadSpeed = 0;
    let uploadSpeed = 0;
    let peers = 0;

    for (const dl of downloads) {
      totalSize += dl.torrent?.length ?? 0;
      if (dl.torrent && !dl.torrent.done && !dl.torrent.paused) {
        downloadSpeed += dl.torrent.downloadSpeed ?? 0;
        uploadSpeed += dl.torrent.uploadSpeed ?? 0;
        peers += dl.torrent.numPeers ?? 0;
      }
    }

    return { count: downloads.length, totalSize, downloadSpeed, uploadSpeed, peers };
  }

  async checkRemoteAvailability(): Promise<{ available: boolean; enabled: boolean }> {
    const enabled = await remoteStorageService.isEnabled();
    if (!enabled) return { available: false, enabled: false };
    const available = await remoteStorageService.isAvailable();
    return { available, enabled };
  }

  async start(input: DownloadTorrentInput): Promise<Download | { status: "REMOTE_UNAVAILABLE" }> {
    let storageLocation = input.storageLocation ?? "LOCAL";

    if (!input.storageLocation) {
      const { enabled, available } = await this.checkRemoteAvailability();
      if (enabled) {
        if (!available) return { status: "REMOTE_UNAVAILABLE" };
        storageLocation = "REMOTE";
      }
    }

    const torrentSource = await resolveTorrentSource(input.magnetUri);
    logger.debug("DOWNLOAD", `Resolved torrent source (magnet: ${torrentSource})`);

    const torrent = torrentClient.safeAdd(torrentSource, { path: DOWNLOAD_PATH });

    try {
      const metadataTimeout = typeof torrentSource === "string" ? 10_000 : 5_000;
      await waitForTorrentMetadata(torrent, metadataTimeout);

      const [newMedia] = await db
        .insert(media)
        .values(input.media)
        .onConflictDoUpdate({ target: media.id, set: input.media })
        .returning();

      const [newDownload] = await db
        .insert(download)
        .values({
          ...input,
          userId: this.user.id,
          mediaId: newMedia.id,
          storageLocation,
          torrent: extractTorrentLiveData(torrent),
        })
        .returning();

      torrentClient.setupTorrentHandlers(torrent, newDownload.id);

      logger.info("DOWNLOAD", `Started in background: ${input.name || torrent.infoHash} (storage: ${storageLocation})`);

      ActivityLogService.log({
        userId: this.user.id,
        type: "SUCCESS",
        action: "DOWNLOAD_START",
        title: `Download started: ${input.name || "Torrent"}`,
        metadata: { downloadId: newDownload.id, mediaId: newMedia.id, magnetUri: input.magnetUri, storageLocation },
      });

      return newDownload;
    } catch (error) {
      try {
        torrent.destroy();
      } catch {
        logger.error("DOWNLOAD", `Error destroying torrent: ${error}`);
      }
      throw error;
    }
  }

  async pause(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");

    const activeTorrent = torrentClient.resolveTorrent(id, item.torrent?.infoHash);

    if (!activeTorrent) {
      if (item.torrent?.paused) return { success: true };

      const pausedData = {
        ...item.torrent,
        paused: true,
        downloadSpeed: 0,
        uploadSpeed: 0,
      } as TorrentLiveData;
      await db.update(download).set({ torrent: pausedData }).where(eq(download.id, id));
      logger.info("DOWNLOAD", `Paused (no active session): ${item.torrent?.name || id}`);
      return { success: true };
    }

    torrentClient.markDestroying(id);

    const pausedData = { ...extractTorrentLiveData(activeTorrent), paused: true, downloadSpeed: 0, uploadSpeed: 0 };
    await db.update(download).set({ torrent: pausedData }).where(eq(download.id, id));

    await destroyTorrent(activeTorrent, { destroyStore: false });
    torrentClient.deleteActiveTorrent(id);

    logger.info("DOWNLOAD", `Paused: ${activeTorrent.name || id}`);
    setTimeout(() => torrentClient.unmarkDestroying(id), 5_000);
    return { success: true };
  }

  async resume(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");
    if (!item.torrent?.paused) throw new BadRequestError("Torrent is not paused");
    if (!item.torrent.magnetURI) throw new BadRequestError("No magnet URI found");

    await torrentClient.attachTorrent(id, item.torrent.magnetURI, DOWNLOAD_PATH, item.torrent.infoHash);

    await db
      .update(download)
      .set({ torrent: { ...item.torrent, paused: false } as TorrentLiveData })
      .where(eq(download.id, id));

    logger.info("DOWNLOAD", `Resumed torrent: ${item.torrent.name || id}`);
    return { success: true };
  }

  async transfer(id: string, input: TransferDownloadInput): Promise<{ success: true } | { status: "ALREADY_EXISTS" }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");
    if (!item.torrent?.done) throw new BadRequestError("Download is not complete");
    if (!item.torrent.name) throw new BadRequestError("No torrent name found");
    if (item.torrent.transferring || isTransferInProgress(id)) {
      throw new BadRequestError("Transfer already in progress");
    }

    const configured = await remoteStorageService.isConfigured();
    if (!configured) throw new BadRequestError("Remote storage is not configured");

    const available = await remoteStorageService.isAvailable();
    if (!available) throw new BadRequestError("Remote storage server is unavailable");

    if (!input.replace) {
      let mediaType: "movie" | "tv" | null = null;
      if (item.mediaId) {
        const mediaRow = await db.query.media.findFirst({ where: eq(media.id, item.mediaId) });
        mediaType = mediaRow?.type ?? null;
      }
      const remotePath = await remoteStorageService.resolveTransferPath(item.torrent.name, mediaType);
      const exists = await remoteStorageService.exists(remotePath);
      if (exists) return { status: "ALREADY_EXISTS" };
    }

    await db
      .update(download)
      .set({
        torrent: {
          ...item.torrent,
          transferring: true,
          transferProgress: 0,
          transferred: false,
        },
        error: null,
      })
      .where(eq(download.id, id));

    runRemoteTransfer(id, { replace: input.replace }).catch((err) => {
      logger.error("DOWNLOAD", `Remote transfer failed for "${item.torrent?.name}": ${err}`);
    });

    return { success: true };
  }

  async delete(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");

    const torrentName = item.torrent?.name;
    const torrent =
      torrentClient.getActiveTorrent(id) ??
      (item.torrent?.infoHash ? torrentClient.findByInfoHash(item.torrent.infoHash) : undefined);

    if (torrent) {
      torrentClient.markDestroying(id);
      torrentClient.deleteActiveTorrent(id);

      destroyTorrent(torrent, { destroyStore: true })
        .then(() => logger.info("DOWNLOAD", `Destroyed files for: ${torrentName}`))
        .catch((err) => logger.error("DOWNLOAD", `Error destroying files`, err));

      setTimeout(() => torrentClient.unmarkDestroying(id), 5_000);
    } else if (torrentName) {
      try {
        const targetPath = resolveWithinDownloads(torrentName);
        fs.rm(targetPath, { recursive: true, force: true })
          .then(() => logger.info("DOWNLOAD", `FS deleted: ${targetPath}`))
          .catch((err) => logger.error("DOWNLOAD", `FS delete failed for ${targetPath}`, err));
      } catch (error) {
        logger.error("DOWNLOAD", `Refusing to delete path outside downloads: ${torrentName}`, error);
      }
    }

    if (item.storageLocation === "REMOTE" && item.torrent?.transferred && item.torrent.remotePath) {
      remoteStorageService
        .remove(item.torrent.remotePath)
        .then(() => logger.info("DOWNLOAD", `Deleted remote file: ${item.torrent?.remotePath}`))
        .catch((err) => logger.warn("DOWNLOAD", `Failed to delete remote file: ${err}`));
    }

    await db.delete(download).where(eq(download.id, id));

    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "DOWNLOAD_DELETE",
      title: `Download deleted: ${torrentName || id}`,
      metadata: { downloadId: id },
    });

    return { success: true };
  }
}
