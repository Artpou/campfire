export const SUBTITLE_EXTENSIONS = /\.(srt|vtt|ass|ssa|sub)$/i;

export function isSubtitleFile(fileNameOrTitle: string): boolean {
  return SUBTITLE_EXTENSIONS.test(fileNameOrTitle);
}
