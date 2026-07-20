import type { ParsedFilename, ParsedShow } from "@ctrl/video-filename-parser";
import { z } from "zod";

import { indexerTypeEnum } from "@/modules/indexer-manager/indexer-manager.schema";
import { mediaSelectSchema } from "@/types";

export type MediaInfos = ParsedFilename | ParsedShow;

export const torrentSchema = z.object({
  title: z.string(),
  tracker: z.string(),
  size: z.number(),
  publishDate: z.string(),
  seeders: z.number(),
  peers: z.number(),
  link: z.string(),
  guid: z.string(),
  detailsUrl: z.string().optional(),
  indexerType: z.enum(indexerTypeEnum),
  downloadUrl: z.string().optional(),
  magnetUrl: z.string().optional(),
  mediaInfos: z.custom<MediaInfos>(),
  isStreamable: z.boolean(),
});

export type Torrent = z.infer<typeof torrentSchema>;
/** Adapter payload before `isStreamable` is attached by TorrentService.list */
export type TorrentResult = Omit<Torrent, "isStreamable">;

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
  trackers: string[];
  peersFound: number;
  indexerSeeders?: number;
}

export const torrentInspectDto = z.object({
  magnet: z.string().min(1).max(8192),
  indexerSeeders: z.coerce.number().int().nonnegative().optional(),
});
export type torrentInspectQuery = z.infer<typeof torrentInspectDto>;

export const torrentListDto = z.object({
  indexerManagerId: z.string(),
  media: mediaSelectSchema,
  indexerId: z.string().optional(),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
});
export type torrentListQuery = z.infer<typeof torrentListDto>;
