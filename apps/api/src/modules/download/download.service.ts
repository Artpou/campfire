import { and, eq, inArray } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import type { Download, DownloadStats, DownloadTorrentInput, TorrentLiveData } from "./download.dto";
import { torrentClient } from "./webtorrent.client";
import { extractTorrentLiveData } from "./webtorrent.helper";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";
const TORRENT_READY_TIMEOUT_MS = 15_000;

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
  async updateTorrent(item: Download): Promise<Download> {
    const activeTorrent = torrentClient.getActiveTorrent(item.id);
    let torrentData: TorrentLiveData | undefined;

    if (activeTorrent && !activeTorrent.paused) {
      torrentData = extractTorrentLiveData(activeTorrent);
    } else {
      torrentData = torrentClient.getPausedData(item.id) ?? (item.torrent as TorrentLiveData | null) ?? undefined;
    }

    if (!torrentData) return item;

    const [newDownload] = await db
      .update(download)
      .set({ torrent: torrentData })
      .where(eq(download.id, item.id))
      .returning();

    return newDownload ?? item;
  }

  async getMany({ ids }: { ids?: string[] }): Promise<Download[]> {
    const downloads = await db.query.download.findMany({
      where: and(eq(download.userId, this.user.id), ids ? inArray(download.id, ids) : undefined),
    });

    return await Promise.all(downloads.map(this.updateTorrent));
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
      const activeTorrent = torrentClient.getActiveTorrent(dl.id);
      if (activeTorrent && !activeTorrent.paused) {
        downloadSpeed += activeTorrent.downloadSpeed ?? 0;
        uploadSpeed += activeTorrent.uploadSpeed ?? 0;
        peers += activeTorrent.numPeers ?? 0;
      }
    }

    return { count: downloads.length, totalSize, downloadSpeed, uploadSpeed, peers };
  }

  async start(input: DownloadTorrentInput): Promise<Download> {
    const torrentSource = await this.resolveTorrentSource(input.magnetUri);
    const torrent = torrentClient.safeAdd(typeof torrentSource === "string" ? torrentSource : input.magnetUri, {
      path: DOWNLOAD_PATH,
    });

    try {
      await this.waitForTorrentReady(torrent);
    } catch (error) {
      try {
        torrent.destroy();
      } catch {}

      const reason = error instanceof Error ? error.message : "Unknown error";
      const uriPreview = input.magnetUri.startsWith("magnet:")
        ? input.magnetUri.slice(0, 60)
        : input.magnetUri.slice(0, 100);
      logger.error("DOWNLOAD", `Failed to start "${input.name}": ${reason} (uri: ${uriPreview})`);
      throw new BadRequestError(`Torrent unreachable: ${reason}`);
    }

    const [newMedia] = await db
      .insert(media)
      .values(input.media)
      .onConflictDoUpdate({ target: media.id, set: input.media })
      .returning();

    if (!newMedia) throw new ServiceUnavailableError("Media creation");

    const [newDownload] = await db
      .insert(download)
      .values({ ...input, userId: this.user.id, mediaId: newMedia.id, torrent: extractTorrentLiveData(torrent) })
      .returning();

    if (!newDownload) {
      try {
        torrent.destroy();
      } catch {}
      throw new ServiceUnavailableError("Download creation");
    }

    torrentClient.setupTorrentHandlers(torrent, newDownload.id, DOWNLOAD_PATH);
    torrentClient.setActiveTorrent(newDownload.id, torrent);

    logger.info("DOWNLOAD", `Started: ${torrent.name}`);
    ActivityLogService.log({
      userId: this.user.id,
      type: "SUCCESS",
      action: "DOWNLOAD_START",
      title: `Download started: ${torrent.name}`,
      metadata: { downloadId: newDownload.id, mediaId: newMedia.id },
    });
    return newDownload;
  }

  private async resolveTorrentSource(uri: string): Promise<string | Buffer> {
    if (uri.startsWith("magnet:")) return uri;

    const response = await fetch(uri, { redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location?.startsWith("magnet:")) return location;
      if (location) return this.resolveTorrentSource(location);
      throw new BadRequestError("Redirect without Location header");
    }

    if (!response.ok) {
      throw new BadRequestError(`Failed to fetch .torrent file (${response.status} ${response.statusText})`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private waitForTorrentReady(torrent: WebTorrent.Torrent): Promise<void> {
    if (torrent.ready) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for torrent metadata"));
      }, TORRENT_READY_TIMEOUT_MS);

      torrent.on("ready", () => {
        clearTimeout(timeout);
        resolve();
      });

      torrent.on("error", (err: unknown) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  async pause(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");

    const activeTorrent = torrentClient.getActiveTorrent(id);
    if (!activeTorrent) throw new NotFoundError("Torrent does not exist");

    torrentClient.markDestroying(id);
    const pausedData = { ...extractTorrentLiveData(activeTorrent), paused: true };
    torrentClient.setPausedData(id, pausedData);
    await destroyTorrent(activeTorrent, { destroyStore: false });
    torrentClient.deleteActiveTorrent(id);

    await db.update(download).set({ torrent: pausedData }).where(eq(download.id, id));

    logger.info("DOWNLOAD", `Paused: ${activeTorrent.name}`);
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "DOWNLOAD_PAUSE",
      title: `Download paused: ${activeTorrent.name}`,
      metadata: { downloadId: id },
    });

    setTimeout(() => torrentClient.unmarkDestroying(id), 5000);
    return { success: true };
  }

  async resume(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");
    if (!item.torrent?.paused) throw new BadRequestError("Torrent is not paused");

    const magnetURI = item.torrent.magnetURI;
    if (!magnetURI) throw new BadRequestError("No magnet URI found");

    torrentClient.clearPausedData(id);

    const torrent = torrentClient.safeAdd(magnetURI, { path: DOWNLOAD_PATH });
    torrentClient.setupTorrentHandlers(torrent, id, DOWNLOAD_PATH);

    if (!torrent.ready) {
      await this.waitForTorrentReady(torrent);
    }
    torrentClient.setActiveTorrent(id, torrent);

    await db
      .update(download)
      .set({ torrent: { ...extractTorrentLiveData(torrent), paused: false } })
      .where(eq(download.id, id));
    logger.info("DOWNLOAD", `Resumed: ${torrent.name}`);
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "DOWNLOAD_RESUME",
      title: `Download resumed: ${torrent.name}`,
      metadata: { downloadId: id },
    });
    return { success: true };
  }

  async delete(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download");

    let torrent: WebTorrent.Torrent | undefined = torrentClient.getActiveTorrent(id);

    if (!torrent && item.torrent?.infoHash) {
      torrent = torrentClient.findByInfoHash(item.torrent.infoHash);
    }

    const torrentName = item.torrent?.name ?? id;
    const magnetURI = item.torrent?.magnetURI;

    if (torrent) {
      torrentClient.markDestroying(id);
      await destroyTorrent(torrent, { destroyStore: true });
      torrentClient.deleteActiveTorrent(id);
      setTimeout(() => torrentClient.unmarkDestroying(id), 5000);
      logger.info("DOWNLOAD", `Destroyed torrent with files: ${torrentName}`);
    } else if (magnetURI) {
      try {
        const uri =
          magnetURI.startsWith("magnet:") || !item.torrent?.infoHash
            ? magnetURI
            : `magnet:?xt=urn:btih:${item.torrent.infoHash}`;

        const tempTorrent = torrentClient.safeAdd(uri, { path: DOWNLOAD_PATH });

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 10_000);
          if (tempTorrent.ready) {
            clearTimeout(timeout);
            resolve();
          } else {
            tempTorrent.on("ready", () => {
              clearTimeout(timeout);
              resolve();
            });
          }
        });

        torrentClient.markDestroying(id);
        await destroyTorrent(tempTorrent, { destroyStore: true });
        setTimeout(() => torrentClient.unmarkDestroying(id), 5000);
        logger.info("DOWNLOAD", `Re-added and destroyed with files: ${torrentName}`);
      } catch (err) {
        logger.error("DOWNLOAD", `Failed to re-add for cleanup: ${torrentName}`, err);
      }
    }

    torrentClient.clearPausedData(id);
    await db.delete(download).where(eq(download.id, id));
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "DOWNLOAD_DELETE",
      title: `Download deleted: ${torrentName}`,
      metadata: { downloadId: id },
    });
    return { success: true };
  }
}
