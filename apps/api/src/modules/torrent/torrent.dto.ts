import { z } from "zod";

import { indexerTypeEnum } from "@/modules/indexer-manager/indexer-manager.schema";
import { mediaSelectSchema } from "@/modules/media/media.dto";

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

export const torrentIndexerDto = z.object({
  id: z.string(),
  name: z.enum(indexerTypeEnum),
  privacy: z.enum(["private", "semi-private", "public"]),
});
export type TorrentIndexerQuery = z.infer<typeof torrentIndexerDto>;

export const torrentSearchDto = z.object({
  media: mediaSelectSchema,
  indexerId: z.string(),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
});
export type torrentSearchQuery = z.infer<typeof torrentSearchDto>;

export const torrentInspectDto = z.object({
  magnet: z.string().min(1),
});
export type torrentInspectQuery = z.infer<typeof torrentInspectDto>;
