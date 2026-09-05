import { z } from "zod";

import { mediaInputSchema } from "./media.dto";

export const downloadTorrentDto = z.object({
  magnetUri: z
    .string()
    .min(1)
    .max(8192)
    .refine((v) => v.startsWith("magnet:") || /^https?:\/\//i.test(v), {
      message: "Must be a magnet link or HTTP(S) URL",
    }),
  name: z.string().max(512),
  media: mediaInputSchema,
  origin: z.string().max(256).optional(),
  quality: z.string().max(64).optional(),
  language: z.string().max(64).optional(),
  container: z.string().max(16).optional(),
  preferLocal: z.boolean().optional(),
  moduleIndexerId: z.string().uuid().optional(),
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

export const downloadFileQueryDto = z.object({
  token: z.string().min(1).max(2048),
});
export type DownloadFileQuery = z.infer<typeof downloadFileQueryDto>;

export const downloadFileTokenResponseDto = z.object({
  token: z.string(),
});
export type DownloadFileTokenResponse = z.infer<typeof downloadFileTokenResponseDto>;

export const batchDeleteDownloadsDto = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  dbOnly: z.boolean().optional(),
});
export type BatchDeleteDownloadsInput = z.infer<typeof batchDeleteDownloadsDto>;
