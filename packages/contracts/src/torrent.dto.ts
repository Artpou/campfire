import { z } from "zod";

import { mediaInputSchema } from "./media.dto";

export const torrentListDto = z.object({
  moduleId: z.string(),
  media: mediaInputSchema,
  indexerId: z.string().optional(),
  season: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
});
export type TorrentListQuery = z.infer<typeof torrentListDto>;

export const torrentInspectDto = z.object({
  magnet: z.string().min(1).max(8192),
  indexerSeeders: z.coerce.number().int().nonnegative().optional(),
});
export type TorrentInspectQuery = z.infer<typeof torrentInspectDto>;
