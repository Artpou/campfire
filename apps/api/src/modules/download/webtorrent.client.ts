import { eq } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import type { TorrentLiveData } from "@/modules/download/download.schema";
import { download } from "@/modules/download/download.schema";
import type { EventEmitter } from "node:events";
import { extractTorrentLiveData } from "./webtorrent.helper";

class WebTorrentManager {
  private client: WebTorrent.Instance | null = null;
  private activeTorrents = new Map<string, WebTorrent.Torrent>();
  private initError: Error | null = null;
  private isInitialized = false;
  private isInitializing = false;

  private pauseCache = new Map<string, TorrentLiveData>();
  private destroyingIds = new Set<string>();

  markDestroying(id: string): void {
    this.destroyingIds.add(id);
  }

  unmarkDestroying(id: string): void {
    this.destroyingIds.delete(id);
  }

  setPausedData(id: string, data: TorrentLiveData) {
    this.pauseCache.set(id, { ...data, uploadSpeed: 0, downloadSpeed: 0 });
  }

  getPausedData(id: string) {
    return this.pauseCache.get(id);
  }

  clearPausedData(id: string) {
    this.pauseCache.delete(id);
  }

  async initialize(downloadPath: string): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      logger.debug("WEBTORRENT", "Already initialized or initializing, skipping...");
      return;
    }

    this.isInitializing = true;

    try {
      logger.info("WEBTORRENT", "Initializing...");
      const WebTorrentModule = (await import("webtorrent")).default;
      this.client = new WebTorrentModule();

      this.client.on("error", (err) => {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("WEBTORRENT", `Client error (non-fatal): ${message}`);
      });

      process.on("uncaughtException", (err) => {
        if (err.message?.includes("_debugId") || err.stack?.includes("webtorrent")) {
          logger.error("WEBTORRENT", `Caught internal WebTorrent exception (non-fatal): ${err.message}`);
          return;
        }
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
    if (this.initError) {
      throw new ServiceUnavailableError(`WebTorrent (init failed: ${this.initError.message})`);
    }
    if (!this.client) {
      throw new ServiceUnavailableError("WebTorrent (initializing)");
    }
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

  setActiveTorrent(id: string, torrent: WebTorrent.Torrent): void {
    this.activeTorrents.set(id, torrent);
  }

  deleteActiveTorrent(id: string): void {
    this.activeTorrents.delete(id);
    this.pauseCache.delete(id);
  }

  safeAdd(uri: string, opts: { path: string }): WebTorrent.Torrent {
    const client = this.getClient();
    const existing = client.torrents.find((t) => t.magnetURI === uri || (t.infoHash && uri.includes(t.infoHash)));
    if (existing) return existing;

    return client.add(uri, opts);
  }

  setupTorrentHandlers(torrent: WebTorrent.Torrent, downloadId: string, _downloadPath: string): void {
    torrent.on("ready", async () => {
      logger.info("WEBTORRENT", `Ready: ${torrent.name}`);
      await db
        .update(download)
        .set({ torrent: extractTorrentLiveData(torrent) })
        .where(eq(download.id, downloadId));

      this.activeTorrents.set(downloadId, torrent);
    });

    torrent.on("done", async () => {
      logger.info("WEBTORRENT", `Completed: ${torrent.name}`);
      await db
        .update(download)
        .set({ torrent: { ...extractTorrentLiveData(torrent), done: true } })
        .where(eq(download.id, downloadId));
    });

    (torrent as unknown as EventEmitter).on("error", async (err: Error) => {
      if (this.destroyingIds.has(downloadId)) return;

      logger.error(
        "WEBTORRENT",
        `Error on "${torrent.name || downloadId}": ${err.message}` +
          ` (infoHash: ${torrent.infoHash || "unknown"}, magnetURI: ${(torrent.magnetURI || "").slice(0, 60)}...)`,
      );
      await db.update(download).set({ error: err.message }).where(eq(download.id, downloadId));
    });
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
        this.setupTorrentHandlers(restored, item.id, downloadPath);

        this.activeTorrents.set(item.id, restored);
      } catch (error) {
        logger.error("WEBTORRENT", `Failed to restore: ${item.torrent?.name}`, error);
      }
    }
  }
}

export const torrentClient = new WebTorrentManager();
