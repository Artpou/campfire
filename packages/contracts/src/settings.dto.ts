import { z } from "zod";

import { mediaTypeEnum } from "./enums";

export const upsertSettingsDto = z.object({
  tmdbApiKey: z.string().max(256).optional(),
});
export type UpsertSettingsInput = z.infer<typeof upsertSettingsDto>;

export const manualSyncDto = z.object({
  remotePath: z.string().min(1),
  mediaId: z.number().int().positive(),
  type: z.enum(mediaTypeEnum),
});
export type ManualSyncInput = z.infer<typeof manualSyncDto>;
