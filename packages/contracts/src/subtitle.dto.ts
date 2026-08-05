import { z } from "zod";

export const subtitlesSearchDto = z.object({
  tmdb_id: z.string().max(32),
  languages: z.string().max(128),
  type: z.enum(["movie", "tv"]).optional(),
});
export type SubtitlesSearchQuery = z.infer<typeof subtitlesSearchDto>;

export const downloadSubtitleDto = z.object({
  downloadId: z.string().max(128),
  url: z.string().max(2048),
  language: z.string().max(64),
  mediaTitle: z.string().max(512),
});
export type DownloadSubtitleInput = z.infer<typeof downloadSubtitleDto>;
