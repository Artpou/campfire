import { buildOrganizedRemotePath, extractYearFromDate, formatError, parseSeasonEpisode } from "@seedarr/shared";

import { logger } from "@/shared/helpers/logger.helper";
import { resolveWithinDownloads } from "@/shared/helpers/path.helper";

import { activityFor } from "@/modules/activity/activity.service";
import { downloadRepository } from "@/modules/download/download.repository";
import { mediaRepository } from "@/modules/media/media.repository";
import { moduleRepository } from "@/modules/module/module.repository";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";
import { waitUntilNoStreams } from "@/modules/streaming/lease/streaming-lease";
import { invalidateStreamSource } from "@/modules/streaming/streaming-cache.helper";
import fs from "node:fs/promises";
import { torrentClient, UNMARK_DESTROYING_DELAY_MS } from "../webtorrent/webtorrent-manager";

const activeTransfers = new Set<string>();

export function isTransferInProgress(downloadId: string): boolean {
  return activeTransfers.has(downloadId);
}

async function resolveMediaRow(mediaId: number | null | undefined) {
  if (!mediaId) return null;
  return (await mediaRepository.find(mediaId)) ?? null;
}

async function resolveOrganizedTransferPath(dl: {
  mediaId: number | null;
  torrent?: { name?: string } | null;
}): Promise<string> {
  const mediaRow = await resolveMediaRow(dl.mediaId);
  const paths = await remoteStorageService.getMediaPaths();
  const torrentName = dl.torrent?.name ?? "download";

  if (!mediaRow) {
    const mediaType = null;
    return remoteStorageService.resolveTransferPath(torrentName, mediaType);
  }

  const basePath = mediaRow.type === "tv" ? paths.tvPath : paths.moviePath;
  const parsed = parseSeasonEpisode(torrentName);
  return buildOrganizedRemotePath({
    basePath,
    title: mediaRow.title,
    year: extractYearFromDate(mediaRow.release_date),
    type: mediaRow.type,
    season: mediaRow.type === "tv" ? (parsed?.season ?? null) : null,
  });
}

/** Tear down any in-memory WebTorrent session for this download (files may already be gone). */
function unloadTorrentSession(downloadId: string): void {
  const active = torrentClient.getActiveTorrent(downloadId);
  if (!active) return;

  torrentClient.markDestroying(downloadId);
  torrentClient.deleteActiveTorrent(downloadId);
  try {
    active.destroy({ destroyStore: false });
  } catch {
    // already destroyed
  }
  setTimeout(() => torrentClient.unmarkDestroying(downloadId), UNMARK_DESTROYING_DELAY_MS);
}

/** Mark transfer started in DB so the UI can poll immediately (auto + manual). */
export async function markTransferStarting(downloadId: string): Promise<void> {
  const dl = await downloadRepository.find(downloadId);
  if (!dl?.torrent) return;

  await downloadRepository.updateTorrent(downloadId, { transferring: true, transferProgress: 0 }, { error: null });
}

export async function runRemoteTransfer(
  downloadId: string,
  options?: { replace?: boolean; isAutoTransfer?: boolean },
): Promise<void> {
  if (activeTransfers.has(downloadId)) {
    throw new Error("Transfer already in progress");
  }

  activeTransfers.add(downloadId);

  try {
    const dl = await downloadRepository.find(downloadId);
    if (!dl?.torrent?.name) throw new Error("Download not found or has no torrent name");
    if (!dl.torrent.done) throw new Error("Download is not complete");

    const torrentName = dl.torrent.name;
    const localPath = resolveWithinDownloads(torrentName);
    const userId = dl.userId;
    const remotePath = await resolveOrganizedTransferPath(dl);
    const storageModuleId = await moduleRepository.getEnabledStorageModuleId();

    if (!dl.torrent.transferring) {
      await markTransferStarting(downloadId);
    }

    if (options?.replace || dl.remoteLocation) {
      logger.info("TRANSFER", `Replacing existing remote path: ${remotePath}`);
      await remoteStorageService.remove(remotePath);
    }

    logger.info("TRANSFER", `Transferring to remote: ${remotePath}`);

    const totalSize = dl.torrent.length ?? 0;
    let lastProgressAt = Date.now();
    let lastProgressBytes = 0;

    await remoteStorageService.transferDirectory(localPath, remotePath, async (progress) => {
      const now = Date.now();
      const elapsed = (now - lastProgressAt) / 1000;
      const currentBytes = progress * totalSize;
      const speed = elapsed > 0 ? (currentBytes - lastProgressBytes) / elapsed : 0;
      lastProgressAt = now;
      lastProgressBytes = currentBytes;

      await downloadRepository.updateTorrent(downloadId, {
        transferring: true,
        transferProgress: progress,
        transferSpeed: Math.max(0, Math.round(speed)),
      });
    });

    await downloadRepository.updateTorrent(
      downloadId,
      { transferring: false, transferProgress: 1 },
      { remoteLocation: remotePath, moduleStorageId: storageModuleId, error: null },
    );

    invalidateStreamSource(downloadId);
    logger.info("TRANSFER", `Transfer complete: ${torrentName} -> ${remotePath}`);

    const shouldDeleteLocal =
      options?.isAutoTransfer === true && (await remoteStorageService.shouldDeleteLocalAfterTransfer());
    if (shouldDeleteLocal) {
      await waitUntilNoStreams(downloadId);
      unloadTorrentSession(downloadId);
      await fs.rm(localPath, { recursive: true, force: true });
      await downloadRepository.update(downloadId, { torrent: null });
      logger.info("TRANSFER", `Deleted local files and cleared torrent data: ${torrentName}`);
    } else {
      logger.info("TRANSFER", `Kept local files after transfer: ${torrentName}`);
    }

    await activityFor(userId).log({
      action: "DOWNLOAD_TRANSFERRED",
      mediaId: dl.mediaId,
      moduleId: storageModuleId,
      metadata: { downloadId, remotePath, name: torrentName },
    });
  } catch (error) {
    const message = formatError(error);
    logger.error("TRANSFER", `Remote transfer failed for "${downloadId}": ${message}`);

    const dl = await downloadRepository.find(downloadId);
    if (dl?.torrent) {
      await downloadRepository.updateTorrent(
        downloadId,
        { transferring: false, transferProgress: undefined },
        { error: `Remote transfer failed: ${message}` },
      );
    }

    await activityFor(dl?.userId).log({
      action: "DOWNLOAD_TRANSFERRED",
      type: "ERROR",
      mediaId: dl?.mediaId,
      moduleId: dl?.moduleStorageId,
      metadata: { downloadId, error: message, name: dl?.torrent?.name },
    });

    throw error;
  } finally {
    activeTransfers.delete(downloadId);
  }
}
