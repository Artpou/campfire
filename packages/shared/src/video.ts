/** All video containers Seedarr can store / play when complete. */
export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

/** Progressive-friendly containers that can stream while downloading. */
export const STREAMABLE_VIDEO_EXTENSIONS = /\.(mp4|m4v|webm)$/i;

export function isVideoFile(fileNameOrTitle: string): boolean {
  return VIDEO_EXTENSIONS.test(fileNameOrTitle);
}

export function isStreamableVideo(fileNameOrTitle: string): boolean {
  return STREAMABLE_VIDEO_EXTENSIONS.test(fileNameOrTitle);
}

export type PlayableDownloadInput = {
  remoteLocation?: string | null;
  torrent?: {
    done?: boolean;
    name?: string | null;
    files?: Array<{ name: string }> | null;
  } | null;
};

function videoCandidates(download: PlayableDownloadInput): string[] {
  const name = download.torrent?.name ?? "";
  const files = download.torrent?.files ?? [];
  return [name, ...files.map((file) => file.name)].filter(Boolean);
}

/** True when the download can be opened in the player right now. */
export function isPlayableDownload(download: PlayableDownloadInput): boolean {
  const candidates = videoCandidates(download);
  if (candidates.some(isStreamableVideo)) return true;

  const complete = Boolean(download.torrent?.done || download.remoteLocation);
  if (!complete) return false;

  return candidates.some(isVideoFile);
}
