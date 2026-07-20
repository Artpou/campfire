import type WebTorrent from "webtorrent";

import { ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { waitForTorrentMetadata } from "./webtorrent.helper";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";

class WebTorrentManager {
  private client: WebTorrent.Instance | null = null;
  private activeTorrents = new Map<string, WebTorrent.Torrent>();
  private initError: Error | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private destroyingIds = new Set<string>();

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
        logger.error("WEBTORRENT", `Client error (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      });

      process.on("uncaughtException", (err) => {
        const isWebTorrentError =
          err.stack?.includes("webtorrent") || err.stack?.includes("bittorrent") || err.stack?.includes("ut_metadata");
        if (isWebTorrentError) {
          logger.error("WEBTORRENT", `Uncaught exception from WebTorrent internals: ${err.message}`);
          return;
        }
        throw err;
      });

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
}

export const torrentClient = new WebTorrentManager();
