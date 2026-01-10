import { eq, or } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { torrentDownload } from "@/db/schema";
import { TorrentLiveData } from "@/types";
import * as path from "node:path";

/**
 * Singleton WebTorrent client manager
 * Handles initialization, lifecycle, and active torrent tracking
 */

// biome-ignore lint/complexity/noStaticOnlyClass: we want to keep the class static
export class WebTorrentClient {
  private static client: WebTorrent.Instance | null = null;
  private static activeTorrents = new Map<string, WebTorrent.Torrent>();
  private static initError: Error | null = null;
  private static isInitialized = false;
  private static isInitializing = false;

  private static pauseCache = new Map<string, TorrentLiveData>();

  static setPausedData(id: string, data: TorrentLiveData) {
    this.pauseCache.set(id, { ...data, uploadSpeed: 0, downloadSpeed: 0 });
  }

  static getPausedData(id: string) {
    return this.pauseCache.get(id);
  }

  static clearPausedData(id: string) {
    this.pauseCache.delete(id);
  }

  /**
   * Initialize WebTorrent client and restore active torrents (non-blocking)
   * Should be called once at server startup without await
   */
  static async initialize(downloadPath: string): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      console.log("[WEBTORRENT] Already initialized or initializing, skipping...");
      return;
    }

    this.isInitializing = true;

    try {
      console.log("[WEBTORRENT] Initializing...");
      const WebTorrent = (await import("webtorrent")).default;
      this.client = new WebTorrent();

      console.log("[WEBTORRENT] Client created");

      // Restore torrents in background - don't await
      this.restoreActiveTorrents(downloadPath).catch((error) => {
        console.error("[WEBTORRENT] Failed to restore torrents:", error);
      });

      this.isInitialized = true;
      this.isInitializing = false;
      console.log("[WEBTORRENT] Initialization complete");
    } catch (error) {
      console.error("[WEBTORRENT] Failed to initialize:", error);
      this.initError = error as Error;
      this.isInitializing = false;
      // Don't throw - allow server to continue
    }
  }

  static getClient(): WebTorrent.Instance {
    if (this.initError) {
      throw new Error(`WebTorrent client failed to initialize: ${this.initError.message}`);
    }
    if (!this.client) {
      throw new Error("WebTorrent client not initialized yet. Please try again in a moment.");
    }
    return this.client;
  }

  static getActiveTorrent(id: string): WebTorrent.Torrent | undefined {
    return this.activeTorrents.get(id);
  }

  static setActiveTorrent(id: string, torrent: WebTorrent.Torrent): void {
    this.activeTorrents.set(id, torrent);
  }

  static deleteActiveTorrent(id: string): void {
    this.activeTorrents.delete(id);
  }

  static setupTorrentHandlers(
    torrent: WebTorrent.Torrent,
    downloadId: string,
    downloadPath: string,
  ): void {
    torrent.on("ready", async () => {
      const savePath = path.relative(downloadPath, torrent.path);
      console.log(`[WEBTORRENT] Ready: ${torrent.name}`);
      await db
        .update(torrentDownload)
        .set({
          infoHash: torrent.infoHash,
          magnetUri: torrent.magnetURI,
          name: torrent.name,
          size: torrent.length,
          status: "downloading",
          startedAt: new Date(),
          savePath,
        })
        .where(eq(torrentDownload.id, downloadId));

      this.activeTorrents.set(downloadId, torrent);
    });

    torrent.on("done", async () => {
      console.log(`[WEBTORRENT] Completed: ${torrent.name}`);
      await db
        .update(torrentDownload)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(torrentDownload.id, downloadId));
    });

    (torrent as unknown as { on: (event: string, callback: (err: Error) => void) => void }).on(
      "error",
      async (err: Error) => {
        console.error(`[WEBTORRENT] Error: ${torrent.name} - ${err.message}`);
        await db
          .update(torrentDownload)
          .set({
            status: "failed",
            error: err.message,
          })
          .where(eq(torrentDownload.id, downloadId));
      },
    );
  }

  private static async restoreActiveTorrents(downloadPath: string): Promise<void> {
    const downloads = await db
      .select()
      .from(torrentDownload)
      .where(
        or(
          eq(torrentDownload.status, "downloading"),
          eq(torrentDownload.status, "paused"),
          eq(torrentDownload.status, "completed"),
        ),
      )
      .all();

    if (downloads.length > 0) {
      console.log(`[WEBTORRENT] Restoring ${downloads.length} torrent(s)...`);
    }

    for (const download of downloads) {
      if (!download.magnetUri || !this.client) continue;

      try {
        // Skip paused downloads - they will be restored when resumed
        if (download.status === "paused") {
          console.log(`[WEBTORRENT] Skipped paused: ${download.name}`);
          continue;
        }

        console.log(`[WEBTORRENT] Restoring: ${download.name} (${download.status})`);
        const restored = this.client.add(download.magnetUri, {
          path: downloadPath,
        });
        this.setupTorrentHandlers(restored, download.id, downloadPath);

        // Wait for torrent to be ready before adding to active map
        await new Promise<void>((resolve) => {
          restored.on("ready", () => resolve());
        });

        this.activeTorrents.set(download.id, restored);
      } catch (error) {
        console.error(`[WEBTORRENT] Failed to restore: ${download.name}`, error);
      }
    }
  }
}
