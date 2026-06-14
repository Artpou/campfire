import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { download } from "@/modules/download/download.schema";
import { mediaSelectSchema } from "@/modules/media/media.dto";

export type { TorrentLiveData, TorrentStatus } from "@/modules/download/download.schema";

export const downloadSelectSchema = createSelectSchema(download);
export type Download = z.infer<typeof downloadSelectSchema>;

export interface DownloadStats {
  count: number;
  totalSize: number;
  downloadSpeed: number;
  uploadSpeed: number;
  peers: number;
}

export const downloadTorrentDto = z.object({
  magnetUri: z.string(),
  name: z.string(),
  media: mediaSelectSchema,
  origin: z.string().optional(),
  quality: z.string().optional(),
  language: z.string().optional(),
});
export type DownloadTorrentInput = z.infer<typeof downloadTorrentDto>;
