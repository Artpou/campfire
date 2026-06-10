import { createSelectSchema } from "drizzle-zod";
import WebTorrent from "webtorrent";
import { z } from "zod";

import { torrentDownload } from "@/modules/download/download.schema";
import { MediaSelect } from "@/types";

const downloadSelectSchema = createSelectSchema(torrentDownload);
type DownloadSelect = z.infer<typeof downloadSelectSchema>;

type ExcludeFunctions<T> = {
  // biome-ignore lint/complexity/noBannedTypes: we want to exclude functions
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
type TorrentLiveBase = ExcludeFunctions<Omit<WebTorrent.Torrent, "files" | "pieces" | "torrentFile">>;

export interface TorrentLiveData extends Omit<TorrentLiveBase, "created"> {
  created: Date | string;
  files: {
    name: string;
    path: string;
    length: number;
    downloaded: number;
    progress: number;
  }[];
}

export type Download = DownloadSelect & {
  media?: MediaSelect;
  live?: TorrentLiveData;
};

// Download input schema
export const downloadTorrentDto = z.object({
  magnetUri: z.string(),
  name: z.string(),
  mediaId: z.number().optional(),
  origin: z.string().optional(),
  quality: z.string().optional(),
  language: z.string().optional(),
});
export type DownloadTorrentInput = z.infer<typeof downloadTorrentDto>;
