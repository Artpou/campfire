import type WebTorrent from "webtorrent";

const PEER_PROBE_MS = 8_000;

export async function probeTorrentPeers(torrent: WebTorrent.Torrent, timeoutMs = PEER_PROBE_MS): Promise<number> {
  if (torrent.numPeers > 0) return torrent.numPeers;

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      torrent.off("wire", onActivity);
      torrent.off("download", onActivity);
      resolve(torrent.numPeers);
    };

    const onActivity = () => {
      if (torrent.numPeers > 0) finish();
    };

    const timer = setTimeout(finish, timeoutMs);
    torrent.on("wire", onActivity);
    torrent.on("download", onActivity);
  });
}
