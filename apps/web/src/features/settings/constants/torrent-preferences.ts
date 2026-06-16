import type { TorrentQuality } from "@seedarr/sdk";

export type QualityPreference = TorrentQuality | "all";

export const QUALITY_LEVELS: QualityPreference[] = ["all", "480p", "720p", "1080p", "1440p", "2160p", "4K"];

export function getQualityIndex(quality: QualityPreference): number {
  return QUALITY_LEVELS.indexOf(quality);
}
