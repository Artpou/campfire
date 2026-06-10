import { and, eq, inArray } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import type { PaginationQuery } from "@/shared/pagination.dto";
import { paginate } from "@/shared/pagination.helper";

import { db } from "@/db/db";
import { BadRequestError, NotFoundError, ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { torrentDownload } from "@/modules/download/download.schema";
import type { Download, DownloadTorrentInput } from "./download.dto";
import { WebTorrentClient } from "./webtorrent.client";
import { extractTorrentLiveData } from "./webtorrent.helper";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";
const TORRENT_READY_TIMEOUT_MS = 15_000;

function withLiveData(item: Download): Download {
  const activeTorrent = WebTorrentClient.getActiveTorrent(item.id);
  return {
    ...item,
    live:
      item.status === "paused" || !activeTorrent
        ? WebTorrentClient.getPausedData(item.id)
        : extractTorrentLiveData(activeTorrent),
  };
}

export class DownloadService extends IdentifiableService<Download> {
  async getMany(query?: Partial<PaginationQuery>): Promise<Download[]> {
    const conditions = [];

    if (!this.isPrivileged) {
      conditions.push(eq(torrentDownload.userId, this.user.id));
    }

    if (query?.ids) {
      conditions.push(inArray(torrentDownload.id, query.ids));
    }

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const paginationOpts = query?.page && query?.limit ? paginate(query) : {};

    return (await db.query.torrentDownload.findMany({ where, ...paginationOpts })).map(withLiveData);
  }

  async start(input: DownloadTorrentInput): Promise<Download> {
    const existing = await db.query.torrentDownload.findFirst({
      where: and(eq(torrentDownload.magnetUri, input.magnetUri), eq(torrentDownload.userId, this.user.id)),
    });

    if (existing) {
      if (existing.status === "completed" && !WebTorrentClient.getActiveTorrent(existing.id)) {
        const restored = WebTorrentClient.getClient().add(existing.magnetUri, { path: DOWNLOAD_PATH });
        WebTorrentClient.setupTorrentHandlers(restored, existing.id, DOWNLOAD_PATH);
        logger.debug("DOWNLOAD", `Re-added for seeding: ${existing.name}`);
      }
      return existing;
    }

    const torrentSource = await this.resolveTorrentSource(input.magnetUri);
    const torrent = WebTorrentClient.getClient().add(torrentSource, { path: DOWNLOAD_PATH });

    try {
      await this.waitForTorrentReady(torrent);
    } catch (error) {
      torrent.destroy();
      const reason = error instanceof Error ? error.message : "Unknown error";
      const uriPreview = input.magnetUri.startsWith("magnet:")
        ? input.magnetUri.slice(0, 60)
        : input.magnetUri.slice(0, 100);
      logger.error("DOWNLOAD", `Failed to start "${input.name}": ${reason} (uri: ${uriPreview})`);
      throw new BadRequestError(`Torrent unreachable: ${reason}`);
    }

    const [newDownload] = await db
      .insert(torrentDownload)
      .values({
        ...input,
        userId: this.user.id,
        infoHash: torrent.infoHash,
        status: "downloading",
        startedAt: new Date(),
      })
      .returning();

    if (!newDownload) {
      torrent.destroy();
      throw new ServiceUnavailableError("Download creation");
    }

    WebTorrentClient.setupTorrentHandlers(torrent, newDownload.id, DOWNLOAD_PATH);
    WebTorrentClient.setActiveTorrent(newDownload.id, torrent);

    logger.info("DOWNLOAD", `Started: ${torrent.name}`);
    return newDownload;
  }

  /**
   * If the URI is an HTTP(s) URL (e.g. Prowlarr/Jackett download endpoint),
   * pre-fetch the .torrent file and return its Buffer so WebTorrent doesn't
   * have to handle the HTTP request itself (which often fails).
   * Handles redirects to magnet: URIs (common with public indexers).
   * Magnet URIs are returned as-is.
   */
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
    const activeTorrent = WebTorrentClient.getActiveTorrent(id);
    if (!activeTorrent) {
      const download = await db.query.torrentDownload.findFirst({ where: eq(torrentDownload.id, id) });
      if (!download) throw new NotFoundError("Download");
      throw new BadRequestError(`Download is not active. Current status: ${download.status}`);
    }

    WebTorrentClient.setPausedData(id, extractTorrentLiveData(activeTorrent));
    activeTorrent.destroy({ destroyStore: false });
    WebTorrentClient.deleteActiveTorrent(id);

    await db.update(torrentDownload).set({ status: "paused" }).where(eq(torrentDownload.id, id));
    logger.info("DOWNLOAD", `Paused: ${activeTorrent.name}`);
    return { success: true };
  }

  async resume(id: string): Promise<{ success: true }> {
    const download = await db.query.torrentDownload.findFirst({ where: eq(torrentDownload.id, id) });
    if (!download) throw new NotFoundError("Download");
    if (download.status !== "paused")
      throw new BadRequestError(`Cannot resume download with status: ${download.status}`);

    WebTorrentClient.clearPausedData(id);

    const torrent = WebTorrentClient.getClient().add(download.magnetUri, { path: DOWNLOAD_PATH });
    WebTorrentClient.setupTorrentHandlers(torrent, id, DOWNLOAD_PATH);

    await new Promise<void>((resolve) => torrent.on("ready", resolve));
    WebTorrentClient.setActiveTorrent(id, torrent);

    await db.update(torrentDownload).set({ status: "downloading" }).where(eq(torrentDownload.id, id));
    logger.info("DOWNLOAD", `Resumed: ${torrent.name}`);
    return { success: true };
  }

  async delete(id: string): Promise<{ success: true }> {
    const activeTorrent = WebTorrentClient.getActiveTorrent(id);
    if (activeTorrent) {
      activeTorrent.destroy();
      WebTorrentClient.deleteActiveTorrent(id);
    }

    await db.delete(torrentDownload).where(eq(torrentDownload.id, id));
    return { success: true };
  }
}
