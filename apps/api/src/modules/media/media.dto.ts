import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

import { media, mediaTypeEnum } from "@/db/schema";
import { paginationSchema } from "@/modules/pagination/pagination.dto";

// Database schemas
export const mediaSelectSchema = createSelectSchema(media);
export const mediaInsertSchema = createInsertSchema(media);
export const mediaUpdateSchema = createUpdateSchema(media).omit({ id: true });
export const mediaStatusSchema = z.object({
  id: z.number(),
  like: z.boolean().optional(),
  watchList: z.boolean().optional(),
  download: z.boolean().optional(),
});
export type MediaStatus = typeof mediaStatusSchema._input;

export type Media = typeof mediaSelectSchema._output & MediaStatus;
export type MediaInsert = typeof mediaInsertSchema._input;
export type MediaUpdate = typeof mediaUpdateSchema._input;

export const mediaFilterEnum = ["like", "watch-list", "recently-viewed"] as const;
export type MediaFilter = (typeof mediaFilterEnum)[number];

export const listMediaParamsSchema = z.object({
  type: z.enum(mediaTypeEnum).optional(),
  filter: z.enum(mediaFilterEnum).optional(),
  ids: z
    .string()
    .transform((val) => val.split(","))
    .optional(),
});
export type ListMediaParams = z.infer<typeof listMediaParamsSchema>;

export const listMediaSchema = paginationSchema.extend(listMediaParamsSchema.shape);
export type ListMedia = z.infer<typeof listMediaSchema>;
export type ListMediaSchema = typeof listMediaSchema._input;
