import { TorrentQuality } from "@/modules/torrent/adapters/base.adapter";

export function getTorrentQuality(title: string): TorrentQuality {
  const t = title.toLowerCase();

  if (t.includes("2160p") || t.includes("4k") || t.includes("uhd")) {
    return "4K";
  }

  if (t.includes("1440p") || t.includes("2k")) {
    return "2K";
  }

  if (t.includes("1080p") || t.includes("720p") || t.includes("hdrip") || t.includes("bluray")) {
    return "HD";
  }

  if (
    t.includes("480p") ||
    t.includes("360p") ||
    t.includes("dvdrip") ||
    t.includes("webrip") ||
    t.includes("cam") ||
    t.includes("ts")
  ) {
    return "SD";
  }

  return undefined;
}
