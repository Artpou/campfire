import { VIDEO_EXTENSIONS } from "@seedarr/shared";
import { eq } from "drizzle-orm";
import type WebTorrent from "webtorrent";

import { db } from "@/db/db";
import { logger } from "@/helpers/logger.helper";
import { resolveWithinDownloads } from "@/helpers/path.helper";
import { probeVideoDuration } from "@/helpers/video.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import fs from "node:fs/promises";
import path from "node:path";
import { markTransferStarting, runRemoteTransfer } from "./download-storage.helper";
import { extractTorrentLiveData } from "./webtorrent.helper";
import { torrentClient } from "./webtorrent-manager";

const SYNC_THROTTLE_MS = 1_500;
const HEALTH_CHECK_INTERVAL_MS = 60_000;
/** Minutes to seed after download completes before unloading from WebTorrent. -1 = keep forever. */
const SEED_AFTER_COMPLETE_MINUTES = Number.parseInt(process.env.SEED_AFTER_COMPLETE_MINUTES ?? "5", 10);

const lastSyncTimestamps = new Map<string, number>();
const handlersAttached = new Set<string>();
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

export function setupTorrentHandlers(torrent: WebTorrent.Torrent, downloadId: string): void {
  if (torrent.ready) {
    torrentClient.setActiveTorrent(downloadId, torrent);
  }

  if (handlersAttached.has(downloadId)) return;
  handlersAttached.add(downloadId);

  const syncDb = async (force: boolean, extraFields?: Record<string, unknown>) => {
    if (torrentClient.isDestroying(downloadId)) return;

    if (!force) {
      const lastSync = lastSyncTimestamps.get(downloadId) ?? 0;
      if (Date.now() - lastSync < SYNC_THROTTLE_MS) return;
    }

    lastSyncTimestamps.set(downloadId, Date.now());

    const current = await db.query.download.findFirst({ where: eq(download.id, downloadId) });
    const liveData = extractTorrentLiveData(torrent);
    if (current?.torrent?.paused && extraFields?.paused !== false) {
      liveData.paused = true;
      liveData.downloadSpeed = 0;
      liveData.uploadSpeed = 0;
    }

    await db
      .update(download)
      .set({
        torrent: {
          ...liveData,
          transferring: current?.torrent?.transferring,
          transferProgress: current?.torrent?.transferProgress,
          skipAutoTransfer: current?.torrent?.skipAutoTransfer,
          durationSeconds: current?.torrent?.durationSeconds,
          videoCodec: current?.torrent?.videoCodec,
          audioCodec: current?.torrent?.audioCodec,
          moovAtStart: current?.torrent?.moovAtStart,
          ...extraFields,
        },
      })
      .where(eq(download.id, downloadId));
  };

  torrent.on("ready", () => {
    logger.info("WEBTORRENT", `Ready: ${torrent.name}`);
    torrentClient.setActiveTorrent(downloadId, torrent);
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

      if (dl?.torrent && !dl.torrent.durationSeconds && torrent.name) {
        const durationSeconds = await probeLargestVideoDuration(torrent.name);
        if (durationSeconds != null) {
          await db
            .update(download)
            .set({ torrent: { ...dl.torrent, done: true, durationSeconds } })
            .where(eq(download.id, downloadId));
        }
      }

      if (dl?.torrent?.skipAutoTransfer) {
        scheduleUnload(downloadId);
        return;
      }

      const enabled = await remoteStorageService.isEnabled();
      if (enabled && torrent.name) {
        await markTransferStarting(downloadId);
        runRemoteTransfer(downloadId, { isAutoTransfer: true }).catch((err) => {
          logger.error("WEBTORRENT", `Remote transfer failed for "${torrent.name}": ${err}`);
        });
      }

      scheduleUnload(downloadId);
    } catch (err) {
      logger.error("WEBTORRENT", `Error in done handler for "${torrent.name}": ${err}`);
    }
  });

  torrent.on("error", async (err) => {
    try {
      if (torrentClient.isDestroying(downloadId)) return;
      const message = err instanceof Error ? err.message : String(err);
      logger.error("WEBTORRENT", `Error on "${torrent.name || downloadId}": ${message}`);
      await db.update(download).set({ error: message }).where(eq(download.id, downloadId));
      await syncDb(true);
    } catch (handlerErr) {
      logger.error("WEBTORRENT", `Error in error handler for "${downloadId}": ${handlerErr}`);
    }
  });

  if (torrent.ready) {
    torrentClient.setActiveTorrent(downloadId, torrent);
    syncDb(true);
  }
}

/**
 * After a torrent completes, seed briefly then unload from memory.
 * Files stay on disk — only the WebTorrent peer session is torn down.
 * Disabled when SEED_AFTER_COMPLETE_MINUTES < 0.
 */
function scheduleUnload(downloadId: string): void {
  if (SEED_AFTER_COMPLETE_MINUTES < 0) return;

  const delayMs = SEED_AFTER_COMPLETE_MINUTES * 60_000;
  const timer = setTimeout(() => {
    if (torrentClient.isDestroying(downloadId)) return;
    const current = torrentClient.getActiveTorrent(downloadId);
    if (!current || !current.done) return;

    torrentClient.markDestroying(downloadId);
    try {
      current.destroy({ destroyStore: false }, () => {
        torrentClient.deleteActiveTorrent(downloadId);
        torrentClient.unmarkDestroying(downloadId);
        clearHandlersForDownload(downloadId);
        logger.info("WEBTORRENT", `Unloaded completed torrent: ${current.name}`);
      });
    } catch {
      torrentClient.unmarkDestroying(downloadId);
    }
  }, delayMs);
  timer.unref();
}

export async function restoreActiveTorrents(): Promise<void> {
  const downloads = await db.select().from(download).all();
  const activeDownloads = downloads.filter(
    (item) => item.torrent && !item.torrent.done && !item.torrent.paused && item.torrent.magnetURI,
  );

  if (activeDownloads.length === 0) {
    startHealthCheck();
    return;
  }

  logger.info("WEBTORRENT", `Restoring ${activeDownloads.length} torrent(s)...`);

  const results = await Promise.allSettled(
    activeDownloads.map(async (item) => {
      if (!item.torrent?.magnetURI) return;
      const restored = await torrentClient.attachTorrent(item.id, item.torrent.magnetURI, item.torrent.infoHash);
      setupTorrentHandlers(restored, item.id);
      reannounce(restored);
      logger.debug("WEBTORRENT", `Restored: ${restored.name}`);
    }),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.warn("WEBTORRENT", `Failed to restore ${failures.length}/${activeDownloads.length} torrent(s)`);
  }

  startHealthCheck();
}

/** Force trackers to reannounce to find fresh peers. */
function reannounce(torrent: WebTorrent.Torrent): void {
  try {
    if (torrent.done) return;
    // WebTorrent's discovery re-announce via all trackers
    const discovery = (torrent as unknown as { discovery?: { tracker?: { update(): void } } }).discovery;
    discovery?.tracker?.update();
  } catch {
    // Non-critical — tracker reconnect is best-effort
  }
}

/**
 * Periodic health check: reannounce stale torrents (0 peers / 0 speed)
 * and unload completed torrents still held in memory.
 */
function startHealthCheck(): void {
  if (healthCheckTimer) return;

  healthCheckTimer = setInterval(() => {
    for (const torrent of torrentClient.getAllTorrents()) {
      if (torrent.paused) continue;

      if (torrent.done) {
        if (SEED_AFTER_COMPLETE_MINUTES < 0) continue;
        logger.debug("WEBTORRENT", `Unloading lingering completed torrent: ${torrent.name}`);
        try {
          for (const id of torrentClient.detachTorrent(torrent)) {
            clearHandlersForDownload(id);
          }
          torrent.destroy({ destroyStore: false });
        } catch {}
        continue;
      }

      if (torrent.numPeers === 0 && torrent.downloadSpeed === 0) {
        logger.debug("WEBTORRENT", `Stale torrent detected, reannouncing: ${torrent.name}`);
        reannounce(torrent);
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS);

  healthCheckTimer.unref();
}

export function stopHealthCheck(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

export function clearHandlersForDownload(downloadId: string): void {
  handlersAttached.delete(downloadId);
  lastSyncTimestamps.delete(downloadId);
}

async function probeLargestVideoDuration(torrentName: string): Promise<number | undefined> {
  const root = resolveWithinDownloads(torrentName);
  try {
    const stats = await fs.stat(root);
    if (stats.isFile()) {
      return VIDEO_EXTENSIONS.test(path.basename(root)) ? probeVideoDuration({ filePath: root }) : undefined;
    }

    const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
    const videos = await Promise.all(
      entries
        .filter((e) => e.isFile() && VIDEO_EXTENSIONS.test(e.name))
        .map(async (e) => {
          const filePath = path.join(e.parentPath || root, e.name);
          const size = (await fs.stat(filePath)).size;
          return { filePath, size };
        }),
    );
    if (videos.length === 0) return undefined;
    const largest = videos.sort((a, b) => b.size - a.size)[0];
    return probeVideoDuration({ filePath: largest.filePath });
  } catch {
    return undefined;
  }
}
