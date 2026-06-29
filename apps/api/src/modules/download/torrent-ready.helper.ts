import type WebTorrent from "webtorrent";

import { BadRequestError } from "@/errors/error";

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
      const message = err instanceof Error ? err.message : String(err);
      reject(new BadRequestError(message));
    };

    torrent.once("metadata", onMetadata);
    torrent.once("ready", onReady);
    torrent.once("error", onError);
  });
}
