import { eq } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import { waitForTorrentMetadata } from "@/modules/download/torrent-ready.helper";
import { extractTorrentLiveData } from "./webtorrent.helper";

const SYNC_THROTTLE_MS = 1_500;

class WebTorrentManager {
  private client: WebTorrent.Instance | null = null;
  private activeTorrents = new Map<string, WebTorrent.Torrent>();
  private initError: Error | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private destroyingIds = new Set<string>();
  private lastSyncTimestamps = new Map<string, number>();
  private handlersAttached = new Set<string>();

  markDestroying(id: string): void {
    this.destroyingIds.add(id);
  }

  unmarkDestroying(id: string): void {
    this.destroyingIds.delete(id);
  }

  async initialize(downloadPath: string): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      logger.debug("WEBTORRENT", "Already initialized or initializing, skipping...");
      return;
    }

    this.isInitializing = true;

    try {
      logger.debug("WEBTORRENT", "Initializing...");
      const WebTorrentModule = (await import("webtorrent")).default;
      this.client = new WebTorrentModule();

      this.client.on("error", (err) => {
        logger.error("WEBTORRENT", `Client error (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      });

      process.on("uncaughtException", (err) => {
        const isWebTorrentError =
          err.stack?.includes("webtorrent") || err.stack?.includes("bittorrent") || err.stack?.includes("ut_metadata");
        if (isWebTorrentError) {
          logger.error("WEBTORRENT", `Uncaught exception from WebTorrent internals: ${err.message}`);
          return;
        }
        logger.error("PROCESS", `Uncaught exception (non-WebTorrent): ${err.message}`);
        throw err;
      });

      logger.debug("WEBTORRENT", "Client created");

      this.isInitialized = true;
      this.isInitializing = false;

      if (process.env.RESUME_DOWNLOADS === "true") {
        this.restoreActiveTorrents(downloadPath).catch((error) => {
          logger.error("WEBTORRENT", "Failed to restore torrents:", error);
        });
        logger.info("WEBTORRENT", "Initialization complete (restoring downloads in background)");
      } else {
        logger.info("WEBTORRENT", "Initialization complete (resume disabled)");
      }
    } catch (error) {
      logger.error("WEBTORRENT", "Failed to initialize:", error);
      this.initError = error as Error;
      this.isInitializing = false;
    }
  }

  getClient(): WebTorrent.Instance {
    if (this.initError) throw new ServiceUnavailableError(`WebTorrent (init failed: ${this.initError.message})`);
    if (!this.client) throw new ServiceUnavailableError("WebTorrent (initializing)");

    return this.client;
  }

  getAllTorrents(): WebTorrent.Torrent[] {
    return this.client?.torrents || [];
  }

  getActiveTorrent(id: string): WebTorrent.Torrent | undefined {
    return this.activeTorrents.get(id);
  }

  resolveTorrent(downloadId: string, infoHash?: string): WebTorrent.Torrent | undefined {
    const byId = this.activeTorrents.get(downloadId);
    if (byId) return byId;

    if (!infoHash) return undefined;

    const byHash = this.findByInfoHash(infoHash);
    if (byHash) {
      this.activeTorrents.set(downloadId, byHash);
      return byHash;
    }

    return undefined;
  }

  findByInfoHash(infoHash: string): WebTorrent.Torrent | undefined {
    if (!this.client) return undefined;
    return this.client.torrents.find((t) => t.infoHash === infoHash);
  }

  deleteActiveTorrent(id: string): void {
    this.activeTorrents.delete(id);
    this.lastSyncTimestamps.delete(id);
    this.handlersAttached.delete(id);
  }

  async attachTorrent(
    downloadId: string,
    magnetURI: string,
    downloadPath: string,
    infoHash?: string,
  ): Promise<WebTorrent.Torrent> {
    const existing = this.resolveTorrent(downloadId, infoHash);
    if (existing) {
      this.setupTorrentHandlers(existing, downloadId);
      if (!existing.ready) await waitForTorrentMetadata(existing, 15_000);
      this.activeTorrents.set(downloadId, existing);
      return existing;
    }

    const torrent = this.safeAdd(magnetURI, { path: downloadPath });
    this.setupTorrentHandlers(torrent, downloadId);
    if (!torrent.ready) await waitForTorrentMetadata(torrent, 15_000);
    this.activeTorrents.set(downloadId, torrent);
    return torrent;
  }

  safeAdd(source: string | Buffer, opts: { path: string }): WebTorrent.Torrent {
    const client = this.getClient();
    if (typeof source === "string") {
      const existing = client.torrents.find(
        (t) => t.magnetURI === source || (t.infoHash && source.includes(t.infoHash)),
      );
      if (existing) return existing;
    }

    return client.add(source, opts);
  }

  setupTorrentHandlers(torrent: WebTorrent.Torrent, downloadId: string): void {
    if (torrent.ready) {
      this.activeTorrents.set(downloadId, torrent);
    }

    if (this.handlersAttached.has(downloadId)) return;
    this.handlersAttached.add(downloadId);

    const syncDb = async (force: boolean, extraFields?: Record<string, unknown>) => {
      if (this.destroyingIds.has(downloadId)) return;

      if (!force) {
        const lastSync = this.lastSyncTimestamps.get(downloadId) ?? 0;
        if (Date.now() - lastSync < SYNC_THROTTLE_MS) return;
      }

      this.lastSyncTimestamps.set(downloadId, Date.now());

      const current = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
      const liveData = extractTorrentLiveData(torrent);
      if (current?.torrent?.paused && extraFields?.paused !== false) {
        liveData.paused = true;
        liveData.downloadSpeed = 0;
        liveData.uploadSpeed = 0;
      }

      await db
        .update(download)
        .set({ torrent: { ...liveData, ...extraFields } })
        .where(eq(download.id, downloadId));
    };

    torrent.on("ready", () => {
      logger.info("WEBTORRENT", `Ready: ${torrent.name}`);
      this.activeTorrents.set(downloadId, torrent);
      syncDb(true).catch((err) => logger.error("WEBTORRENT", `syncDb error on ready: ${err}`));
    });

    torrent.on("download", () => {
      syncDb(false).catch((err) => logger.error("WEBTORRENT", `syncDb error on download: ${err}`));
    });

    torrent.on("done", async () => {
      try {
        logger.info("WEBTORRENT", `Completed: ${torrent.name}`);
        await syncDb(true, { done: true });

        const dl = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
        ActivityLogService.log({
          userId: dl?.userId,
          type: "SUCCESS",
          action: "DOWNLOAD_COMPLETE",
          title: `Download completed: ${torrent.name}`,
          metadata: { downloadId },
        });
      } catch (err) {
        logger.error("WEBTORRENT", `Error in done handler for "${torrent.name}": ${err}`);
      }
    });

    torrent.on("error", async (err) => {
      try {
        if (this.destroyingIds.has(downloadId)) return;
        const message = err instanceof Error ? err.message : String(err);
        logger.error("WEBTORRENT", `Error on "${torrent.name || downloadId}": ${message}`);
        await db.update(download).set({ error: message }).where(eq(download.id, downloadId));
        await syncDb(true);
      } catch (handlerErr) {
        logger.error("WEBTORRENT", `Error in error handler for "${downloadId}": ${handlerErr}`);
      }
    });

    if (torrent.ready) {
      this.activeTorrents.set(downloadId, torrent);
      syncDb(true);
    }
  }

  private async restoreActiveTorrents(downloadPath: string): Promise<void> {
    const downloads = await db.select().from(download).all();
    const activeDownloads = downloads.filter(
      (item) => item.torrent && !item.torrent.done && !item.torrent.paused && item.torrent.magnetURI,
    );

    if (activeDownloads.length > 0) {
      logger.info("WEBTORRENT", `Restoring ${activeDownloads.length} torrent(s)...`);
    }

    for (const item of activeDownloads) {
      if (!item.torrent?.magnetURI || !this.client) continue;

      try {
        logger.debug("WEBTORRENT", `Restoring: ${item.torrent.name}`);
        const restored = await this.attachTorrent(item.id, item.torrent.magnetURI, downloadPath, item.torrent.infoHash);
        logger.debug("WEBTORRENT", `Restored: ${restored.name}`);
      } catch (error) {
        logger.error("WEBTORRENT", `Failed to restore: ${item.torrent?.name}`, error);
      }
    }
  }
}

export const torrentClient = new WebTorrentManager();
