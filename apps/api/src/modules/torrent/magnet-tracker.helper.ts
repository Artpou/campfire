/**
 * Public trackers (ngosang/trackerslist trackers_best, March 2026).
 * Embedded so magnet enrichment works offline; refresh periodically from:
 * https://cdn.jsdelivr.net/gh/ngosang/trackerslist@master/trackers_best.txt
 */
export const PUBLIC_TRACKERS_BEST = [
  "udp://zer0day.ch:1337/announce",
  "udp://tracker.publictracker.xyz:6969/announce",
  "http://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.wildkat.net:6969/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.qu.ax:6969/announce",
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://tracker.opentorrent.top:6969/announce",
  "udp://tracker.gmi.gd:6969/announce",
  "udp://tracker.ducks.party:1984/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://tracker.corpscorp.online:80/announce",
  "udp://tracker.bluefrog.pw:2710/announce",
  "udp://tracker.bittor.pw:1337/announce",
  "udp://tracker.auctor.tv:6969/announce",
  "udp://tracker.004430.xyz:1337/announce",
  "udp://tracker-udp.gbitt.info:80/announce",
  "udp://torrents.tmtime.dev:6969/announce",
  "udp://torrentclub.online:54123/announce",
] as const;

const MAGNET_HAS_TRACKERS = /(?:^|[?&])tr=/i;

export function magnetHasTrackers(magnetUri: string): boolean {
  return MAGNET_HAS_TRACKERS.test(magnetUri);
}

/** Append public trackers to bare magnets (e.g. Torrentio infoHash-only links). */
export function enrichMagnetUri(magnetUri: string, trackers: readonly string[] = PUBLIC_TRACKERS_BEST): string {
  if (!magnetUri.startsWith("magnet:?")) return magnetUri;
  if (magnetHasTrackers(magnetUri)) return magnetUri;

  const trackerParams = trackers.map((tracker) => `&tr=${encodeURIComponent(tracker)}`).join("");
  return `${magnetUri}${trackerParams}`;
}
