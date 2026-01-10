/** biome-ignore-all lint/correctness/noUnusedVariables: we want to exclude some properties */
import type WebTorrent from "webtorrent";

import type { TorrentLiveData } from "./download.dto";

export const extractTorrentLiveData = (torrent: WebTorrent.Torrent): TorrentLiveData => ({
  infoHash: torrent.infoHash,
  magnetURI: torrent.magnetURI,
  torrentFile: torrent.torrentFile,
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
  const videoExtensions = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

  const videoFiles = torrent.files
    .filter((file) => videoExtensions.test(file.name))
    .sort((a, b) => b.length - a.length);

  return videoFiles[0] || null;
}
