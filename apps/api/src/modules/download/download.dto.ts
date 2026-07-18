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
  magnetUri: z.string().max(8192),
  name: z.string().max(512),
  media: mediaSelectSchema,
  origin: z.string().max(256).optional(),
  quality: z.string().max(64).optional(),
  language: z.string().max(64).optional(),
  /** Force local-only (e.g. remote unavailable dialog) — skips auto-transfer on complete. */
  preferLocal: z.boolean().optional(),
});
export type DownloadTorrentInput = z.infer<typeof downloadTorrentDto>;
