import type { DownloadTorrentInput, PaginationQuery } from "@seedarr/contracts";
import { and, desc, eq, inArray } from "drizzle-orm";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { signToken } from "@/shared/helpers/crypto.helper";
import { logger } from "@/shared/helpers/logger.helper";
import { paginate } from "@/shared/helpers/pagination.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { type Download, type DownloadStats, download } from "@/modules/download/download.schema";
import { type DownloadableFile, getDownloadableFile } from "@/modules/download/local/local-file.helper";
import { media, watchProgress } from "@/modules/media/media.schema";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";
import { invalidateStreamSource } from "@/modules/streaming/streaming.service";
import { resolveTorrentSource } from "@/modules/torrent/torrent-source.helper";
import { visibleDownloadSql } from "./download-storage.helper";
import { getLocalDiskSpace } from "./local/local-disk.helper";
import { isTransferInProgress, markTransferStarting, runRemoteTransfer } from "./remote/remote-transfer.helper";
import { extractTorrentLiveData, waitForTorrentMetadata } from "./webtorrent/webtorrent.helper";
import {
  destroyLocalTorrentFiles,
  pauseTorrent,
  reannounceTorrent,
  recheckTorrent,
  resumeTorrent,
} from "./webtorrent/webtorrent.service";
import { torrentClient } from "./webtorrent/webtorrent-manager";
import { setupTorrentHandlers } from "./webtorrent/webtorrent-sync";

const DOWNLOAD_FILE_TOKEN_TTL_SECONDS = 60;

/** Magnet URIs need longer — peers must be discovered before metadata arrives. */
const METADATA_TIMEOUT_MAGNET_MS = 10_000;
/** .torrent buffers already carry metadata; only wait for ready/error. */
const METADATA_TIMEOUT_FILE_MS = 5_000;

export class DownloadService extends IdentifiableService<Download> {
  async getMany(params?: PaginationQuery): Promise<Download[]> {
    const where = params?.ids ? inArray(download.id, params.ids) : await visibleDownloadSql();
    const paginationOpts = !params?.ids && params?.page && params?.limit ? paginate(params) : {};

    return db.query.download.findMany({
      where,
      orderBy: desc(download.createdAt),
      ...paginationOpts,
    });
  }

  async getByMediaId(mediaId: number): Promise<Download[]> {
    return db.query.download.findMany({
      where: and(eq(download.mediaId, mediaId), await visibleDownloadSql()),
      orderBy: desc(download.createdAt),
    });
  }

  async findMany(params?: PaginationQuery): Promise<Download[]> {
    return this.getMany(params);
  }

  private async requireDownload(id: string): Promise<Download> {
    const [item] = await this.getMany({ ids: [id] });
    if (!item) throw new NotFoundError("Download");
    return item;
  }

  async getStats(): Promise<DownloadStats> {
    const downloads = await db.query.download.findMany({
      with: { media: { columns: { type: true } } },
    });

    let totalSize = 0;
    let downloadSpeed = 0;
    let uploadSpeed = 0;
    let peers = 0;
    let activeDownloads = 0;
    let activeUploads = 0;
    const movies = { count: 0, totalSize: 0 };
    const tv = { count: 0, totalSize: 0 };

    let localSeedarrUsed = 0;
    let remoteSeedarrUsed = 0;

    for (const dl of downloads) {
      const size = dl.size ?? dl.torrent?.length ?? 0;
      totalSize += size;

      const mediaType = dl.media?.type;
      if (mediaType === "movie") {
        movies.count += 1;
        movies.totalSize += size;
      } else if (mediaType === "tv") {
        tv.count += 1;
        tv.totalSize += size;
      }

      // Local copy present when torrent metadata remains (cleared after delete-local transfer).
      if (dl.torrent) localSeedarrUsed += size;
      if (dl.remoteLocation) remoteSeedarrUsed += size;

      const torrent = dl.torrent;
      if (!torrent) continue;

      const isActive = torrent.transferring === true || (!torrent.done && !torrent.paused);
      if (isActive) {
        activeDownloads += 1;
        downloadSpeed += torrent.downloadSpeed ?? 0;
        peers += torrent.numPeers ?? 0;
      }

      if (!torrent.paused && (torrent.uploadSpeed ?? 0) > 0) {
        activeUploads += 1;
        uploadSpeed += torrent.uploadSpeed ?? 0;
      }
    }

    const [localDisk, remoteEnabled] = await Promise.all([
      getLocalDiskSpace(torrentClient.downloadPath),
      remoteStorageService.isEnabled(),
    ]);
    const remoteDisk = remoteEnabled ? await remoteStorageService.getDiskSpace() : null;
    const remoteProtocol = remoteDisk?.protocol ?? (await remoteStorageService.getProtocol());

    const local =
      localSeedarrUsed > 0
        ? {
            seedarrUsed: localSeedarrUsed,
            diskUsed: localDisk?.used ?? null,
            diskTotal: localDisk?.total ?? null,
          }
        : null;

    const isFtpManualQuota = remoteDisk?.protocol === "ftp" && remoteDisk.used === 0;
    const remote =
      remoteEnabled && remoteSeedarrUsed > 0
        ? {
            seedarrUsed: remoteSeedarrUsed,
            diskUsed: remoteDisk && !isFtpManualQuota ? remoteDisk.used : null,
            diskTotal: remoteDisk?.total ?? null,
            protocol: remoteProtocol ?? ("ftp" as const),
          }
        : null;

    return {
      count: downloads.length,
      totalSize,
      movies,
      tv,
      downloadSpeed,
      uploadSpeed,
      activeDownloads,
      activeUploads,
      peers,
      storage: { local, remote },
    };
  }

  async start(input: DownloadTorrentInput): Promise<Download | { status: "REMOTE_UNAVAILABLE" }> {
    const { preferLocal, ...downloadInput } = input;

    if (!preferLocal && (await remoteStorageService.isEnabled())) {
      if (!(await remoteStorageService.isAvailable())) return { status: "REMOTE_UNAVAILABLE" };
    }

    const torrentSource = await resolveTorrentSource(input.magnetUri);
    logger.debug("DOWNLOAD", `Resolved torrent source (magnet: ${torrentSource})`);

    const torrent = torrentClient.safeAdd(torrentSource, { path: torrentClient.downloadPath });

    try {
      const metadataTimeout = typeof torrentSource === "string" ? METADATA_TIMEOUT_MAGNET_MS : METADATA_TIMEOUT_FILE_MS;
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
          moduleIndexerId: input.moduleIndexerId,
          size: liveData.length || null,
          torrent: liveData,
        })
        .returning();

      setupTorrentHandlers(torrent, newDownload.id);

      logger.info("DOWNLOAD", `Started in background: ${input.name || torrent.infoHash}`);

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
    return pauseTorrent(id, await this.requireDownload(id));
  }

  async resume(id: string): Promise<{ success: true }> {
    return resumeTorrent(id, await this.requireDownload(id));
  }

  async recheck(id: string): Promise<{ success: true }> {
    return recheckTorrent(id, await this.requireDownload(id));
  }

  async reannounce(id: string): Promise<{ success: true }> {
    return reannounceTorrent(id, await this.requireDownload(id));
  }

  // --- Remote / file ---

  async transfer(id: string): Promise<{ success: true }> {
    const item = await this.requireDownload(id);
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

  async listRemoteFiles(id: string): Promise<{ name: string; path: string; length: number }[]> {
    const item = await this.requireDownload(id);
    if (!item.remoteLocation) return [];
    return remoteStorageService.listFiles(item.remoteLocation);
  }

  createFileToken(id: string): { token: string } {
    return {
      token: signToken({ downloadId: id, userId: this.user.id }, DOWNLOAD_FILE_TOKEN_TTL_SECONDS),
    };
  }

  async getDownloadableFile(id: string): Promise<DownloadableFile> {
    const file = await getDownloadableFile(id);
    if (!file) throw new NotFoundError("Download");
    return file;
  }

  async reassignMedia(id: string, newMediaId: number): Promise<{ success: true }> {
    await this.requireDownload(id);

    await db.update(download).set({ mediaId: newMediaId }).where(eq(download.id, id));

    return { success: true };
  }

  async batchDelete(ids: string[], options?: { dbOnly?: boolean }): Promise<{ deleted: number; skipped: number }> {
    const rows = await db.query.download.findMany({
      where: inArray(download.id, ids),
      columns: { id: true, userId: true },
    });

    let deleted = 0;
    let skipped = 0;

    for (const row of rows) {
      const canDelete = row.userId === this.user.id || this.roleLevel >= ROLE_LEVELS.admin;
      if (!canDelete) {
        skipped++;
        continue;
      }
      try {
        await this.delete(row.id, { dbOnly: options?.dbOnly, scope: "all" });
        deleted++;
      } catch {
        skipped++;
      }
    }

    return { deleted, skipped };
  }

  async delete(
    id: string,
    options?: { dbOnly?: boolean; scope?: "torrent" | "remote" | "all"; unlink?: boolean },
  ): Promise<{ success: true }> {
    const item = await this.requireDownload(id);

    if (item.userId !== this.user.id && this.roleLevel < ROLE_LEVELS.admin) {
      throw new ForbiddenError();
    }

    const scope = options?.scope ?? "all";

    invalidateStreamSource(id);

    if (options?.dbOnly) {
      if (this.roleLevel < ROLE_LEVELS.admin) throw new ForbiddenError();

      await db.delete(watchProgress).where(eq(watchProgress.downloadId, id));
      await db.delete(download).where(eq(download.id, id));

      return { success: true };
    }

    if (scope === "all" || scope === "torrent") destroyLocalTorrentFiles(id, item);

    if (scope === "all" || scope === "remote") {
      if (item.remoteLocation && !options?.unlink) {
        remoteStorageService
          .remove(item.remoteLocation)
          .then(() => logger.info("DOWNLOAD", `Deleted remote file: ${item.remoteLocation}`))
          .catch((err) => logger.warn("DOWNLOAD", `Failed to delete remote file: ${err}`));
      }
    }

    const otherSideExists = scope === "torrent" ? item.remoteLocation : scope === "remote" ? item.torrent : false;
    if (scope === "all" || !otherSideExists) {
      await db.delete(watchProgress).where(eq(watchProgress.downloadId, id));
      await db.delete(download).where(eq(download.id, id));
    } else if (scope === "torrent") {
      await db.update(download).set({ torrent: null, error: null }).where(eq(download.id, id));
    } else if (scope === "remote") {
      await db.update(download).set({ remoteLocation: null }).where(eq(download.id, id));
    }

    return { success: true };
  }
}
