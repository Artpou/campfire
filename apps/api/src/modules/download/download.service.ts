import { eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { torrentDownload } from "@/db/schema";
import type { User } from "../user/user.dto";
import type { DownloadTorrentInput, TorrentDownload, TorrentLiveData } from "./download.dto";
import { WebTorrentClient } from "./webtorrent.client";
import { extractTorrentLiveData } from "./webtorrent.helper";

/**
 * Service for managing torrent downloads
 * Handles CRUD operations and lifecycle management (start, pause, resume, delete)
 */
export class DownloadService extends AuthenticatedService {
  private downloadPath: string;

  constructor(user: User) {
    super(user);
    this.downloadPath = process.env.DOWNLOADS_PATH || "./downloads";
  }

  private select = db.select().from(torrentDownload);
  private insert = db.insert(torrentDownload);

  private getTorrentDetails(item: TorrentDownload): TorrentDownload & { live?: TorrentLiveData } {
    const activeTorrent = WebTorrentClient.getActiveTorrent(item.id);
    return {
      ...item,
      live:
        item.status === "paused" || !activeTorrent
          ? WebTorrentClient.getPausedData(item.id)
          : extractTorrentLiveData(activeTorrent),
    };
  }

  async getById(id: string): Promise<(TorrentDownload & { live?: TorrentLiveData }) | null> {
    const [download] = await this.select.where(eq(torrentDownload.id, id)).limit(1);
    if (!download) return null;

    return this.getTorrentDetails(download);
  }

  async list(): Promise<(TorrentDownload & { live?: TorrentLiveData })[]> {
    const downloads = await this.select.all();

    return downloads.map(this.getTorrentDetails);
  }

  async delete(id: string): Promise<void> {
    const activeTorrent = WebTorrentClient.getActiveTorrent(id);
    if (activeTorrent) {
      activeTorrent.destroy();
      WebTorrentClient.deleteActiveTorrent(id);
    }

    // Delete from DB
    await db.delete(torrentDownload).where(eq(torrentDownload.id, id));
  }

  async start(input: DownloadTorrentInput): Promise<TorrentDownload> {
    const client = WebTorrentClient.getClient();

    const [existingDownload] = await this.select
      .where(eq(torrentDownload.magnetUri, input.magnetUri))
      .limit(1);

    if (existingDownload) {
      console.log(`[DOWNLOAD] Download already exists: ${existingDownload.name}`);
      // If it exists and is completed, ensure it's still seeding
      if (existingDownload.status === "completed") {
        const activeTorrent = WebTorrentClient.getActiveTorrent(existingDownload.id);
        if (!activeTorrent) {
          // Re-add for seeding if not active
          const restored = client.add(existingDownload.magnetUri, {
            path: this.downloadPath,
          });
          WebTorrentClient.setupTorrentHandlers(restored, existingDownload.id, this.downloadPath);
          console.log(
            `[DOWNLOAD] Re-added completed download for seeding: ${existingDownload.name}`,
          );
        }
      }
      return existingDownload;
    }

    const [newDownload] = await this.insert
      .values({
        ...input,
        userId: this.user.id,
        infoHash: "",
        status: "queued",
      })
      .returning();

    if (!newDownload) {
      throw new Error("Failed to create download entry.");
    }

    const torrent = client.add(input.magnetUri, { path: this.downloadPath });
    WebTorrentClient.setupTorrentHandlers(torrent, newDownload.id, this.downloadPath);

    console.log(`[DOWNLOAD] Started download for: ${input.name}`);
    return newDownload;
  }

  async pause(id: string): Promise<void> {
    const activeTorrent = WebTorrentClient.getActiveTorrent(id);
    if (!activeTorrent) {
      const [dbDownload] = await this.select.where(eq(torrentDownload.id, id)).limit(1);

      if (!dbDownload) {
        throw new Error("Download not found");
      }

      throw new Error(`Download is not active. Current status: ${dbDownload.status}`);
    }

    WebTorrentClient.setPausedData(id, extractTorrentLiveData(activeTorrent));

    // Destroy all peer connections to truly pause
    activeTorrent.destroy({ destroyStore: false });
    WebTorrentClient.deleteActiveTorrent(id);
    console.log(`[DOWNLOAD] Paused: ${activeTorrent.name}`);

    // Update status in database
    await db.update(torrentDownload).set({ status: "paused" }).where(eq(torrentDownload.id, id));
  }

  async resume(id: string): Promise<void> {
    const [dbDownload] = await this.select.where(eq(torrentDownload.id, id)).limit(1);

    if (!dbDownload) {
      throw new Error("Download not found");
    }

    if (dbDownload.status !== "paused") {
      throw new Error(`Cannot resume download with status: ${dbDownload.status}`);
    }

    WebTorrentClient.clearPausedData(id);

    console.log(`[DOWNLOAD] Resuming download: ${dbDownload.name}`);

    const client = WebTorrentClient.getClient();
    const activeTorrent = client.add(dbDownload.magnetUri, {
      path: this.downloadPath,
    });

    WebTorrentClient.setupTorrentHandlers(activeTorrent, id, this.downloadPath);

    // Wait for torrent to be ready before adding to active map
    await new Promise<void>((resolve) => {
      activeTorrent.on("ready", () => resolve());
    });

    WebTorrentClient.setActiveTorrent(id, activeTorrent);
    console.log(`[DOWNLOAD] Resumed: ${activeTorrent.name}`);

    // Update status in database
    await db
      .update(torrentDownload)
      .set({ status: "downloading" })
      .where(eq(torrentDownload.id, id));
  }
}
