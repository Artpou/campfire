import { and, desc, eq, inArray } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { resolveWithinDownloads } from "@/helpers/path.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { download } from "@/modules/download/download.schema";
import { media, watchProgress } from "@/modules/media/media.schema";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import { resolveTorrentSource } from "@/modules/torrent/torrent-source.helper";
import fs from "node:fs/promises";
import type { Download, DownloadStats, DownloadTorrentInput, TorrentLiveData } from "./download.dto";
import { isTransferInProgress, markTransferStarting, runRemoteTransfer } from "./download-storage.helper";
import { extractTorrentLiveData, waitForTorrentMetadata } from "./webtorrent.helper";
import { torrentClient } from "./webtorrent-manager";
import { clearHandlersForDownload, setupTorrentHandlers } from "./webtorrent-sync";

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
  /** Members and above share the instance download list; viewers stay scoped to their own. */
  private canSeeAllDownloads(): boolean {
    return this.roleLevel >= ROLE_LEVELS.member;
  }

  async getMany(params?: { ids?: string[] }): Promise<Download[]> {
    const ownerFilter = this.canSeeAllDownloads() ? undefined : eq(download.userId, this.user.id);
    return db.query.download.findMany({
      where: and(ownerFilter, params?.ids ? inArray(download.id, params.ids) : undefined),
    });
  }

  async getByMediaId(mediaId: number): Promise<Download[]> {
    const ownerFilter = this.canSeeAllDownloads() ? undefined : eq(download.userId, this.user.id);
    return db.query.download.findMany({
      where: and(ownerFilter, eq(download.mediaId, mediaId)),
      orderBy: desc(download.createdAt),
    });
  }

  async findMany(params?: { ids?: string[] }): Promise<Download[]> {
    return this.getMany(params);
  }

  async getStats(): Promise<DownloadStats> {
    const downloads = await this.getMany();

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
    const { preferLocal, ...downloadInput } = input;

    if (!preferLocal) {
      const { enabled, available } = await this.checkRemoteAvailability();
      if (enabled && !available) return { status: "REMOTE_UNAVAILABLE" };
    }

    const torrentSource = await resolveTorrentSource(input.magnetUri);
    logger.debug("DOWNLOAD", `Resolved torrent source (magnet: ${torrentSource})`);

    const torrent = torrentClient.safeAdd(torrentSource, { path: torrentClient.downloadPath });

    try {
      const metadataTimeout = typeof torrentSource === "string" ? 10_000 : 5_000;
      await waitForTorrentMetadata(torrent, metadataTimeout);

      const [newMedia] = await db
        .insert(media)
        .values(input.media)
        .onConflictDoUpdate({ target: media.id, set: input.media })
        .returning();

      const liveData = extractTorrentLiveData(torrent);
      if (preferLocal) liveData.skipAutoTransfer = true;

      const [newDownload] = await db
        .insert(download)
        .values({
          ...downloadInput,
          userId: this.user.id,
          mediaId: newMedia.id,
          torrent: liveData,
        })
        .returning();

      setupTorrentHandlers(torrent, newDownload.id);

      logger.info("DOWNLOAD", `Started in background: ${input.name || torrent.infoHash}`);

      ActivityLogService.log({
        userId: this.user.id,
        type: "SUCCESS",
        action: "DOWNLOAD_START",
        title: `Download started: ${input.name || "Torrent"}`,
        metadata: { downloadId: newDownload.id, mediaId: newMedia.id, magnetUri: input.magnetUri, preferLocal },
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
    const [item] = await this.findMany({ ids: [id] });
    if (!item) throw new NotFoundError("Download");

    const activeTorrent = torrentClient.resolveTorrent(id, item.torrent?.infoHash);

    if (!activeTorrent) {
      if (item.torrent?.paused) return { success: true };

      const pausedData = {
        ...item.torrent,
        paused: true,
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
    const [item] = await this.findMany({ ids: [id] });
    if (!item) throw new NotFoundError("Download");
    if (!item.torrent?.paused) throw new BadRequestError("Torrent is not paused");
    if (!item.torrent.magnetURI) throw new BadRequestError("No magnet URI found");

    const resumed = await torrentClient.attachTorrent(id, item.torrent.magnetURI, item.torrent.infoHash);
    setupTorrentHandlers(resumed, id);

    await db
      .update(download)
      .set({ torrent: { ...item.torrent, paused: false } as TorrentLiveData })
      .where(eq(download.id, id));

    logger.info("DOWNLOAD", `Resumed torrent: ${item.torrent.name || id}`);
    return { success: true };
  }

  async transfer(id: string): Promise<{ success: true }> {
    const [item] = await this.findMany({ ids: [id] });
    if (!item) throw new NotFoundError("Download");
    if (!item.torrent?.done) throw new BadRequestError("Download is not complete");
    if (!item.torrent.name) throw new BadRequestError("No torrent name found");
    if (item.remoteLocation) throw new BadRequestError("Already present on remote server");
    if (item.torrent.transferring || isTransferInProgress(id)) {
      throw new BadRequestError("Transfer already in progress");
    }

    const enabled = await remoteStorageService.isEnabled();
    if (!enabled) throw new BadRequestError("Remote storage is not enabled");

    const available = await remoteStorageService.isAvailable();
    if (!available) throw new BadRequestError("Remote storage server is unavailable");

    await markTransferStarting(id);

    runRemoteTransfer(id, { replace: true }).catch((err) => {
      logger.error("DOWNLOAD", `Remote transfer failed for "${item.torrent?.name}": ${err}`);
    });

    return { success: true };
  }

  async delete(id: string): Promise<{ success: true }> {
    const [item] = await this.findMany({ ids: [id] });
    if (!item) throw new NotFoundError("Download");

    const torrentName = item.torrent?.name;
    const torrent =
      torrentClient.getActiveTorrent(id) ??
      (item.torrent?.infoHash ? torrentClient.findByInfoHash(item.torrent.infoHash) : undefined);

    if (torrent) {
      torrentClient.markDestroying(id);
      torrentClient.deleteActiveTorrent(id);
      clearHandlersForDownload(id);

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

    if (item.remoteLocation) {
      remoteStorageService
        .remove(item.remoteLocation)
        .then(() => logger.info("DOWNLOAD", `Deleted remote file: ${item.remoteLocation}`))
        .catch((err) => logger.warn("DOWNLOAD", `Failed to delete remote file: ${err}`));
    }

    await db.delete(watchProgress).where(eq(watchProgress.downloadId, id));
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
