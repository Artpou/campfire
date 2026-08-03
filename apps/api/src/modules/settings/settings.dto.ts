import { z } from "zod";

export const upsertSettingsDto = z.object({
  tmdbApiKey: z.string().max(256).optional(),
});
export type UpsertSettingsInput = z.infer<typeof upsertSettingsDto>;

export interface SettingsResponse {
  tmdbApiKey: string | null;
}

export interface RemoteSyncResponse {
  synced: number;
  skipped: number;
  errors: string[];
}
