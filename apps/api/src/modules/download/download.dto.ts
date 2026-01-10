import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import WebTorrent from "webtorrent";
import { z } from "zod";

import { torrentDownload } from "@/db/schema";

// Download schemas
export const torrentDownloadSelectSchema = createSelectSchema(torrentDownload);
export const torrentDownloadInsertSchema = createInsertSchema(torrentDownload);

export type TorrentDownload = typeof torrentDownloadSelectSchema._output;
export type NewTorrentDownload = typeof torrentDownloadInsertSchema._input;

// Download input schema
export const downloadTorrentSchema = z.object({
  magnetUri: z.string(),
  name: z.string(),
  mediaId: z.number().optional(),
  origin: z.string().optional(),
  quality: z.string().optional(),
  language: z.string().optional(),
});

export type DownloadTorrentInput = z.infer<typeof downloadTorrentSchema>;

type DataPropertiesOnly<T> = {
  // biome-ignore lint/complexity/noBannedTypes: we want to exclude functions
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
export interface TorrentLiveData
  extends DataPropertiesOnly<Omit<WebTorrent.Torrent, "files" | "pieces" | "torrentFile">> {
  files: {
    name: string;
    path: string;
    length: number;
    downloaded: number;
    progress: number;
  }[];
}
