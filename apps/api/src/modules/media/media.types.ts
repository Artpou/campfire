import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { download } from "@/modules/download/download.schema";
import { mediaSelectSchema, watchProgress } from "@/modules/media/media.schema";

const mediaSchema = mediaSelectSchema.extend({
  liked: z.boolean(),
  inWatchList: z.boolean(),
  /** User rating on 0–10 scale (null if not rated). */
  userScore: z.number().nullable(),
  userComment: z.string().nullable(),
  /** Review date (Letterboxd watched date / user-picked). */
  userReviewAt: z.coerce.date().nullable(),
  /** Best activity date for calendar grouping (review > like > progress). */
  activityAt: z.coerce.date().nullable().optional(),
  download: createSelectSchema(download).optional(),
  progress: createSelectSchema(watchProgress)
    .pick({
      position: true,
      duration: true,
      downloadId: true,
      completed: true,
      updatedAt: true,
    })
    .optional(),
});
export type MediaEnriched = z.infer<typeof mediaSchema>;
