import type WebTorrent from "webtorrent";

import { BadRequestError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { resolveWithinDownloads } from "@/shared/helpers/path.helper";

import { downloadRepository } from "@/modules/download/download.repository";
import type { Download } from "@/modules/download/download.schema";
import fs from "node:fs/promises";
import { extractTorrentLiveData } from "./webtorrent.helper";
import { torrentClient, UNMARK_DESTROYING_DELAY_MS } from "./webtorrent-manager";
import { clearHandlersForDownload, setupTorrentHandlers } from "./webtorrent-sync";

function destroyTorrent(torrent: WebTorrent.Torrent, opts: { destroyStore: boolean }): Promise<void> {
  return new Promise<void>((resolve) => {
    try {
      torrent.destroy(opts, () => resolve());
    } catch {
      resolve();
    }
  });
}

export async function pauseTorrent(id: string, item: Download): Promise<{ success: true }> {
  const activeTorrent = torrentClient.resolveTorrent(id, item.torrent?.infoHash);

  if (!activeTorrent) {
    if (item.torrent?.paused) return { success: true };
    await downloadRepository.updateTorrent(id, { paused: true });
    logger.info("DOWNLOAD", `Paused (no active session): ${item.torrent?.name || id}`);
    return { success: true };
  }

  torrentClient.markDestroying(id);
  clearHandlersForDownload(id);

  const pausedData = { ...extractTorrentLiveData(activeTorrent), paused: true, downloadSpeed: 0, uploadSpeed: 0 };
  await downloadRepository.updateTorrent(id, pausedData);

  await destroyTorrent(activeTorrent, { destroyStore: false });
  torrentClient.deleteActiveTorrent(id);

  logger.info("DOWNLOAD", `Paused: ${activeTorrent.name || id}`);
  setTimeout(() => torrentClient.unmarkDestroying(id), UNMARK_DESTROYING_DELAY_MS);
  return { success: true };
}

export async function resumeTorrent(id: string, item: Download): Promise<{ success: true }> {
  if (!item.torrent?.paused) throw new BadRequestError("Torrent is not paused");
  if (!item.torrent.magnetURI) throw new BadRequestError("No magnet URI found");

  const resumed = await torrentClient.attachTorrent(id, item.torrent.magnetURI, item.torrent.infoHash);
  setupTorrentHandlers(resumed, id);

  await downloadRepository.updateTorrent(id, { paused: false });

  logger.info("DOWNLOAD", `Resumed torrent: ${item.torrent.name || id}`);
  return { success: true };
}

export async function recheckTorrent(id: string, item: Download): Promise<{ success: true }> {
  if (!item.torrent?.magnetURI) throw new BadRequestError("No magnet URI found");
  if (item.torrent.done) throw new BadRequestError("Download is already complete");

  const activeTorrent = torrentClient.resolveTorrent(id, item.torrent.infoHash);

  if (activeTorrent) {
    torrentClient.markDestroying(id);
    clearHandlersForDownload(id);
    await destroyTorrent(activeTorrent, { destroyStore: false });
    torrentClient.deleteActiveTorrent(id);
    setTimeout(() => torrentClient.unmarkDestroying(id), UNMARK_DESTROYING_DELAY_MS);
  }

  const resumed = await torrentClient.attachTorrent(id, item.torrent.magnetURI, item.torrent.infoHash);
  setupTorrentHandlers(resumed, id);

  await downloadRepository.updateTorrent(id, { paused: false }, { error: null });

  logger.info("DOWNLOAD", `Force recheck: ${item.torrent.name || id}`);
  return { success: true };
}

export async function reannounceTorrent(id: string, item: Download): Promise<{ success: true }> {
  const activeTorrent = torrentClient.resolveTorrent(id, item.torrent?.infoHash);
  if (!activeTorrent) throw new BadRequestError("Torrent has no active session");

  const discovery = (activeTorrent as unknown as { discovery?: { tracker?: { update(): void } } }).discovery;
  discovery?.tracker?.update();

  logger.info("DOWNLOAD", `Force reannounce: ${item.torrent?.name || id}`);
  return { success: true };
}

export function destroyLocalTorrentFiles(id: string, item: Download): void {
  const torrentName = item.torrent?.name;
  const torrent =
    torrentClient.getActiveTorrent(id) ??
    (item.torrent?.infoHash ? torrentClient.findByInfoHash(item.torrent.infoHash) : undefined);

  if (torrent) {
    torrentClient.markDestroying(id);
    torrentClient.deleteActiveTorrent(id);
    clearHandlersForDownload(id);

    destroyTorrent(torrent, { destroyStore: true })
      .then(() => logger.info("DOWNLOAD", `Destroyed files for: ${torrentName}`))
      .catch((err) => logger.error("DOWNLOAD", `Error destroying files`, err));

    setTimeout(() => torrentClient.unmarkDestroying(id), UNMARK_DESTROYING_DELAY_MS);
  } else if (torrentName) {
    try {
      const targetPath = resolveWithinDownloads(torrentName);
      fs.rm(targetPath, { recursive: true, force: true })
        .then(() => logger.info("DOWNLOAD", `FS deleted: ${targetPath}`))
        .catch((err) => logger.error("DOWNLOAD", `FS delete failed for ${targetPath}`, err));
    } catch (error) {
      logger.error("DOWNLOAD", `Refusing to delete path outside downloads: ${torrentName}`, error);
    }
  }
}
