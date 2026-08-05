import type { ParsedFilename, ParsedShow } from "@ctrl/video-filename-parser";
import type { IndexerType } from "@seedarr/contracts";
import { z } from "zod";

export type MediaInfos = ParsedFilename | ParsedShow;

const torrentSchema = z.object({
  title: z.string(),
  tracker: z.string(),
  size: z.number(),
  publishDate: z.string(),
  seeders: z.number(),
  peers: z.number(),
  link: z.string(),
  guid: z.string(),
  detailsUrl: z.string().optional(),
  indexerType: z.enum(["prowlarr", "jackett", "stremio"] as unknown as [IndexerType, ...IndexerType[]]),
  downloadUrl: z.string().optional(),
  magnetUrl: z.string().optional(),
  mediaInfos: z.custom<MediaInfos>(),
});

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
  trackers: string[];
  peersFound: number;
  indexerSeeders?: number;
}
