import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

import { paginationDto } from "@/shared/pagination.dto";

import { download } from "@/modules/download/download.schema";
import { media, mediaTypeEnum, watchProgress } from "@/modules/media/media.schema";

export const mediaInsertSchema = createInsertSchema(media);
export type MediaInsert = z.infer<typeof mediaInsertSchema>;

export const mediaSelectSchema = createSelectSchema(media);
export type MediaSelect = z.infer<typeof mediaSelectSchema>;

export const mediaSchema = mediaSelectSchema.extend({
  likes: z.number(),
  watchList: z.number(),
  download: createSelectSchema(download).optional(),
  progress: createSelectSchema(watchProgress)
    .pick({
      position: true,
      duration: true,
      downloadId: true,
    })
    .optional(),
});
export type MediaEnriched = z.infer<typeof mediaSchema>;

export const updateProgressDto = z.object({
  position: z.number().int().min(0),
  duration: z.number().int().min(0),
  downloadId: z.string().optional(),
});
export type UpdateProgressQuery = z.infer<typeof updateProgressDto>;

export const listMediaDto = paginationDto.extend({
  type: z.enum(mediaTypeEnum).optional(),
  filter: z.enum(["like", "watch-list", "downloaded"]).optional(),
});
export type ListMediaQuery = z.infer<typeof listMediaDto>;
