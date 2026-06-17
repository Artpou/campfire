import { eq } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import type { EventEmitter } from "node:events";
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
        logger.error("WEBTORRENT", `Caught internal WebTorrent exception (non-fatal): ${err.message}`);
        return;
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

  findByInfoHash(infoHash: string): WebTorrent.Torrent | undefined {
    if (!this.client) return undefined;
    return this.client.torrents.find((t) => t.infoHash === infoHash);
  }

  deleteActiveTorrent(id: string): void {
    this.activeTorrents.delete(id);
    this.lastSyncTimestamps.delete(id);
  }

  safeAdd(uri: string, opts: { path: string }): WebTorrent.Torrent {
    const client = this.getClient();
    const existing = client.torrents.find((t) => t.magnetURI === uri || (t.infoHash && uri.includes(t.infoHash)));
    if (existing) return existing;

    return client.add(uri, opts);
  }

  setupTorrentHandlers(torrent: WebTorrent.Torrent, downloadId: string): void {
    const syncDb = async (force: boolean, extraFields?: Record<string, unknown>) => {
      if (this.destroyingIds.has(downloadId)) return;

      if (!force) {
        const lastSync = this.lastSyncTimestamps.get(downloadId) ?? 0;
        if (Date.now() - lastSync < SYNC_THROTTLE_MS) return;
      }

      this.lastSyncTimestamps.set(downloadId, Date.now());
      await db
        .update(download)
        .set({ torrent: { ...extractTorrentLiveData(torrent), ...extraFields } })
        .where(eq(download.id, downloadId));
    };

    torrent.on("ready", () => {
      logger.info("WEBTORRENT", `Ready: ${torrent.name}`);
      this.activeTorrents.set(downloadId, torrent);
      syncDb(true);
    });

    torrent.on("download", () => {
      syncDb(false);
    });

    torrent.on("done", async () => {
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
    });

    (torrent as unknown as EventEmitter).on("error", async (err: Error) => {
      if (this.destroyingIds.has(downloadId)) return;
      logger.error("WEBTORRENT", `Error on "${torrent.name || downloadId}": ${err.message}`);
      await db.update(download).set({ error: err.message }).where(eq(download.id, downloadId));
      await syncDb(true);
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
        const restored = this.safeAdd(item.torrent.magnetURI, { path: downloadPath });
        this.setupTorrentHandlers(restored, item.id);

        this.activeTorrents.set(item.id, restored);
      } catch (error) {
        logger.error("WEBTORRENT", `Failed to restore: ${item.torrent?.name}`, error);
      }
    }
  }
}

export const torrentClient = new WebTorrentManager();
