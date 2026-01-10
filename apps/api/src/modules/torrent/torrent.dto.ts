import { z } from "zod";

import { indexerTypeEnum } from "@/db/schema";

export const torrentIndexerSchema = z.object({
  id: z.string(),
  name: z.enum(indexerTypeEnum),
  privacy: z.enum(["private", "semi-private", "public"]),
});

export type TorrentIndexer = z.infer<typeof torrentIndexerSchema>;

// Torrent search result schema
export const torrentSchema = z.object({
  title: z.string(),
  tracker: z.string(),
  size: z.number(),
  publishDate: z.string(),
  seeders: z.number(),
  peers: z.number(),
  link: z.string(),
  guid: z.string(),
  quality: z.enum(["4K", "2160p", "1440p", "1080p", "720p", "480p", ""]),
  language: z.enum(["en", "fr", "es", "multi", ""]).optional(),
  detailsUrl: z.string().optional(),
  indexerType: z.enum(indexerTypeEnum),
  // Optional fields from different indexers
  downloadUrl: z.string().optional(), // OxTorrent, etc.
  magnetUrl: z.string().optional(), // Prowlarr redirect URL
});

export type TorrentQuality = z.infer<typeof torrentSchema>["quality"];
export type TorrentLanguage = z.infer<typeof torrentSchema>["language"];

export type Torrent = z.infer<typeof torrentSchema>;

// Torrent inspect types
export interface TorrentInspectFile {
  name: string;
  path: string;
  length: number;
}

export interface TorrentInspectResult {
  name: string;
  infoHash: string;
  files: TorrentInspectFile[];
  totalSize: number;
}
