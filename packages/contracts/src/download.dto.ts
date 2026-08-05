import { z } from "zod";

import { mediaInputSchema } from "./media.dto";

export const downloadTorrentDto = z.object({
  magnetUri: z.string().max(8192),
  name: z.string().max(512),
  media: mediaInputSchema,
  origin: z.string().max(256).optional(),
  quality: z.string().max(64).optional(),
  language: z.string().max(64).optional(),
  preferLocal: z.boolean().optional(),
});
export type DownloadTorrentInput = z.infer<typeof downloadTorrentDto>;

export const deleteDownloadQueryDto = z.object({
  dbOnly: z.enum(["true"]).optional(),
  scope: z.enum(["torrent", "remote", "all"]).optional(),
  unlink: z.enum(["true"]).optional(),
});
export type DeleteDownloadQuery = z.infer<typeof deleteDownloadQueryDto>;

export const reassignMediaDto = z.object({
  mediaId: z.number().int().positive(),
});
export type ReassignMediaInput = z.infer<typeof reassignMediaDto>;
