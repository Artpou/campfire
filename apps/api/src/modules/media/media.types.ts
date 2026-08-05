import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { download } from "@/modules/download/download.schema";
import { mediaSelectSchema, watchProgress } from "@/modules/media/media.schema";

const mediaSchema = mediaSelectSchema.extend({
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
