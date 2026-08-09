/**
 * All video containers Seedarr can store, sync, or play.
 * Includes broadcast/transport formats (`ts`, `m2ts`, `mpg`, `mpeg`) used by NAS remotes.
 */
export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v|ts|m2ts|mpg|mpeg)$/i;

export function isVideoFile(fileNameOrTitle: string): boolean {
  return VIDEO_EXTENSIONS.test(fileNameOrTitle);
}

/** Pick the largest entry by a numeric size field (descending). */
export function pickLargestBySize<T>(items: T[], getSize: (item: T) => number): T | undefined {
  if (items.length === 0) return undefined;
  return items.reduce((best, item) => (getSize(item) > getSize(best) ? item : best));
}
