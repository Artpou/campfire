import { VIDEO_EXTENSIONS } from "@seedarr/shared";

import { logger } from "@/shared/helpers/logger.helper";
import { resolveWithinDownloads } from "@/shared/helpers/path.helper";
import { probeVideoDuration } from "@/shared/helpers/video.helper";
import { findLargestVideoInDirectory } from "@/shared/helpers/video-file.helper";

import { activityFor } from "@/modules/activity/activity.service";
import { downloadRepository } from "@/modules/download/download.repository";
import { validatePendingRequestsForMedia } from "@/modules/request/request.helper";
import { remoteStorageService } from "@/modules/storage-config/remote/remote-storage.service";
import fs from "node:fs/promises";
import path from "node:path";
import { markTransferStarting, runRemoteTransfer } from "./remote/remote-transfer.helper";

/**
 * Post-download orchestration: activity, request validate, duration probe, auto-transfer.
 * Called from webtorrent-sync once the torrent is marked done.
 */
export async function handleDownloadComplete(
  downloadId: string,
  options: { torrentName: string; scheduleUnload: (id: string) => void },
): Promise<void> {
  let dl = await downloadRepository.find(downloadId);

  await activityFor(dl?.userId).log({
    action: "DOWNLOAD_COMPLETE",
    mediaId: dl?.mediaId,
    metadata: { downloadId, name: options.torrentName },
  });

  if (dl?.mediaId) {
    await validatePendingRequestsForMedia(dl.mediaId);
  }

  if (dl?.torrent && !dl.torrent.durationSeconds && options.torrentName) {
    const durationSeconds = await probeLargestVideoDuration(options.torrentName);
    if (durationSeconds != null) {
      await downloadRepository.updateTorrent(downloadId, { done: true, durationSeconds });
      dl = await downloadRepository.find(downloadId);
    }
  }

  if (dl?.torrent?.skipAutoTransfer) {
    options.scheduleUnload(downloadId);
    return;
  }

  const autoTransfer = await remoteStorageService.isAutoTransferEnabled();
  if (autoTransfer && options.torrentName) {
    await markTransferStarting(downloadId);
    runRemoteTransfer(downloadId, { isAutoTransfer: true }).catch((err: unknown) => {
      logger.error("WEBTORRENT", `Remote transfer failed for "${options.torrentName}": ${err}`);
    });
  }

  options.scheduleUnload(downloadId);
}

async function probeLargestVideoDuration(torrentName: string): Promise<number | undefined> {
  const root = resolveWithinDownloads(torrentName);
  try {
    const stats = await fs.stat(root);
    if (stats.isFile()) {
      return VIDEO_EXTENSIONS.test(path.basename(root)) ? probeVideoDuration({ filePath: root }) : undefined;
    }

    const largest = await findLargestVideoInDirectory(root);
    if (!largest) return undefined;
    return probeVideoDuration({ filePath: largest.filePath });
  } catch {
    return undefined;
  }
}
