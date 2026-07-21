/** All video containers Seedarr can store / play when complete. */
export const VIDEO_EXTENSIONS = /\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i;

export function isVideoFile(fileNameOrTitle: string): boolean {
  return VIDEO_EXTENSIONS.test(fileNameOrTitle);
}
