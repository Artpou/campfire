import { formatError } from "@seedarr/shared";
import type WebTorrent from "webtorrent";

import { ServiceUnavailableError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import { waitForTorrentMetadata } from "./webtorrent.helper";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";

/** Delay before clearing the destroying flag so late WebTorrent callbacks are ignored. */
export const UNMARK_DESTROYING_DELAY_MS = 5_000;

const WEBTORRENT_STACK_MARKERS = ["webtorrent", "bittorrent", "ut_metadata", "bittorrent-dht"] as const;

class WebTorrentManager {
  private client: WebTorrent.Instance | null = null;
  private activeTorrents = new Map<string, WebTorrent.Torrent>();
  private initError: Error | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private destroyingIds = new Set<string>();
  private uncaughtHandler: ((err: Error) => void) | null = null;

  get downloadPath(): string {
    return DOWNLOAD_PATH;
  }

  isDestroying(id: string): boolean {
    return this.destroyingIds.has(id);
  }

  markDestroying(id: string): void {
    this.destroyingIds.add(id);
  }

  unmarkDestroying(id: string): void {
    this.destroyingIds.delete(id);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;

    this.isInitializing = true;
    try {
      const WebTorrentModule = (await import("webtorrent")).default;
      this.client = new WebTorrentModule();

      this.client.on("error", (err) => {
        logger.error("WEBTORRENT", `Client error (non-fatal): ${formatError(err)}`);
      });

      this.uncaughtHandler = (err: Error) => {
        const isWebTorrentError = WEBTORRENT_STACK_MARKERS.some((marker) => err.stack?.includes(marker));
        if (isWebTorrentError) {
          logger.error("WEBTORRENT", `Uncaught exception from WebTorrent internals: ${err.message}`);
          return;
        }
        throw err;
      };
      process.on("uncaughtException", this.uncaughtHandler);

      this.isInitialized = true;
      this.isInitializing = false;
      logger.info("WEBTORRENT", "Initialization complete");
    } catch (error) {
      this.initError = error as Error;
      this.isInitializing = false;
      logger.error("WEBTORRENT", "Failed to initialize:", error);
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

  setActiveTorrent(id: string, torrent: WebTorrent.Torrent): void {
    this.activeTorrents.set(id, torrent);
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
  }

  /** Drop map entries for a torrent instance; returns the download IDs that were attached. */
  detachTorrent(torrent: WebTorrent.Torrent): string[] {
    const ids: string[] = [];
    for (const [id, active] of this.activeTorrents) {
      if (active === torrent) {
        this.activeTorrents.delete(id);
        ids.push(id);
      }
    }
    return ids;
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

  async attachTorrent(downloadId: string, magnetURI: string, infoHash?: string): Promise<WebTorrent.Torrent> {
    const existing = this.resolveTorrent(downloadId, infoHash);
    if (existing) {
      if (!existing.ready) await waitForTorrentMetadata(existing, 15_000);
      this.activeTorrents.set(downloadId, existing);
      return existing;
    }

    const torrent = this.safeAdd(magnetURI, { path: DOWNLOAD_PATH });
    if (!torrent.ready) await waitForTorrentMetadata(torrent, 15_000);
    this.activeTorrents.set(downloadId, torrent);
    return torrent;
  }

  async destroy(): Promise<void> {
    if (this.uncaughtHandler) {
      process.removeListener("uncaughtException", this.uncaughtHandler);
      this.uncaughtHandler = null;
    }
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client?.destroy(() => resolve());
      });
      this.client = null;
    }
    this.activeTorrents.clear();
    this.isInitialized = false;
  }
}

export const torrentClient = new WebTorrentManager();
