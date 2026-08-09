/** biome-ignore-all lint/correctness/noUnusedVariables: we want to exclude some properties */
import { formatError } from "@seedarr/shared";
import type WebTorrent from "webtorrent";

import { BadRequestError } from "@/shared/errors/error";
import { pickLargestVideoFromEntries } from "@/shared/helpers/video-file.helper";

import type { TorrentLiveData } from "../download.schema";

export const extractTorrentLiveData = (torrent: WebTorrent.Torrent): TorrentLiveData => ({
  infoHash: torrent.infoHash,
  magnetURI: torrent.magnetURI,
  torrentFileBlobURL: torrent.torrentFileBlobURL,
  announce: torrent.announce,
  "announce-list": torrent["announce-list"],
  timeRemaining: torrent.timeRemaining,
  received: torrent.received,
  downloaded: torrent.downloaded,
  uploaded: torrent.uploaded,
  downloadSpeed: torrent.downloadSpeed,
  uploadSpeed: torrent.uploadSpeed,
  progress: torrent.progress,
  ratio: torrent.ratio,
  length: torrent.length,
  pieceLength: torrent.pieceLength,
  lastPieceLength: torrent.lastPieceLength,
  numPeers: torrent.numPeers,
  path: torrent.path,
  ready: torrent.ready,
  paused: torrent.paused,
  done: torrent.done,
  name: torrent.name,
  created: torrent.created,
  createdBy: torrent.createdBy,
  comment: torrent.comment,
  maxWebConns: torrent.maxWebConns,
  files: torrent.files.map((file) => ({
    name: file.name,
    path: file.path,
    length: file.length,
    downloaded: file.downloaded,
    progress: file.progress,
  })),
});

export function findLargestVideoFile(torrent: WebTorrent.Torrent): WebTorrent.TorrentFile | null {
  return pickLargestVideoFromEntries(torrent.files) ?? null;
}

export function waitForTorrentMetadata(torrent: WebTorrent.Torrent, timeoutMs: number): Promise<void> {
  if (torrent.ready) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new BadRequestError(
          "Could not load torrent metadata — no reachable peers. Try another release or inspect first.",
        ),
      );
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      torrent.off("metadata", onMetadata);
      torrent.off("ready", onReady);
      torrent.off("error", onError);
    };

    const onMetadata = () => {
      cleanup();
      resolve();
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = (err: Error | string) => {
      cleanup();
      const message = formatError(err);
      reject(new BadRequestError(message));
    };

    torrent.once("metadata", onMetadata);
    torrent.once("ready", onReady);
    torrent.once("error", onError);
  });
}
