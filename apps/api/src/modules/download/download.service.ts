import { and, eq, inArray } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import fs from "node:fs/promises";
import path from "node:path";
import type { Download, DownloadStats, DownloadTorrentInput, TorrentLiveData } from "./download.dto";
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
  async getMany({ ids }: { ids?: string[] }): Promise<Download[]> {
    return await db.query.download.findMany({
      where: and(eq(download.userId, this.user.id), ids ? inArray(download.id, ids) : undefined),
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

  async start(input: DownloadTorrentInput): Promise<Download> {
    const torrentSource = await this.resolveTorrentSource(input.magnetUri);
    const uri = typeof torrentSource === "string" ? torrentSource : input.magnetUri;
    logger.debug("DOWNLOAD", `Resolved torrent source: ${uri}`);

    const torrent = torrentClient.safeAdd(uri, { path: DOWNLOAD_PATH });
    try {
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
          torrent: extractTorrentLiveData(torrent),
        })
        .returning();

      torrentClient.setupTorrentHandlers(torrent, newDownload.id);

      logger.info("DOWNLOAD", `Started in background: ${input.name || torrent.infoHash}`);

      ActivityLogService.log({
        userId: this.user.id,
        type: "SUCCESS",
        action: "DOWNLOAD_START",
        title: `Download started: ${input.name || "Torrent"}`,
        metadata: { downloadId: newDownload.id, mediaId: newMedia.id, uri },
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
    const activeTorrent = torrentClient.getActiveTorrent(id);
    if (!activeTorrent) throw new NotFoundError("Active torrent not found");

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
    if (!item) throw new NotFoundError("Download not found");
    if (!item.torrent?.paused) throw new BadRequestError("Torrent is not paused");
    if (!item.torrent.magnetURI) throw new BadRequestError("No magnet URI found");

    await db
      .update(download)
      .set({ torrent: { ...item.torrent, paused: false } as TorrentLiveData })
      .where(eq(download.id, id));

    const torrent = torrentClient.safeAdd(item.torrent.magnetURI, { path: DOWNLOAD_PATH });
    torrentClient.setupTorrentHandlers(torrent, id);

    logger.info("DOWNLOAD", `Resumed torrent: ${torrent.name || id}`);
    return { success: true };
  }

  async delete(id: string): Promise<{ success: true }> {
    const item = await this.get(id);
    if (!item) throw new NotFoundError("Download not found");

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
      const targetPath = path.join(DOWNLOAD_PATH, torrentName);
      fs.rm(targetPath, { recursive: true, force: true })
        .then(() => logger.info("DOWNLOAD", `FS deleted: ${targetPath}`))
        .catch((err) => logger.error("DOWNLOAD", `FS delete failed for ${targetPath}`, err));
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

  private async resolveTorrentSource(uri: string): Promise<string | Buffer> {
    if (uri.startsWith("magnet:")) return uri;
    const response = await fetch(uri, { redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location?.startsWith("magnet:")) return location;
      if (location) return this.resolveTorrentSource(location);
      throw new BadRequestError("Redirect without Location header");
    }

    if (!response.ok) throw new BadRequestError(`Failed to fetch .torrent file (${response.status})`);
    return Buffer.from(await response.arrayBuffer());
  }
}
