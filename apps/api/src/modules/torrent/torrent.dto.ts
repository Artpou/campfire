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
  downloadUrl: z.string().optional(),
  magnetUrl: z.string().optional(),
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
  name: z.string(),
  label: z.string().optional(),
  lang: z.string().optional(),
  privacy: z.enum(["private", "semi-private", "public"]),
  description: z.string().optional(),
  indexerManagerId: z.string().optional(),
  indexerManagerType: z.enum(indexerTypeEnum).optional(),
});
export type TorrentIndexerQuery = z.infer<typeof torrentIndexerDto>;

export const torrentSearchDto = z.object({
  media: mediaSelectSchema,
  indexerManagerId: z.string(),
  indexerId: z.string().optional(),
  imdbId: z.string().optional(),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
});
export type torrentSearchQuery = z.infer<typeof torrentSearchDto>;

export const torrentInspectDto = z.object({
  magnet: z.string().min(1),
});
export type torrentInspectQuery = z.infer<typeof torrentInspectDto>;
