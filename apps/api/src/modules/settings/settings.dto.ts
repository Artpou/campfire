import { z } from "zod";

export const upsertSettingsDto = z.object({
  tmdbApiKey: z.string().max(256).optional(),
});
export type UpsertSettingsInput = z.infer<typeof upsertSettingsDto>;

export interface SettingsResponse {
  tmdbApiKey: string | null;
}

interface RemoteSyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

export interface RemoteSyncResponse {
  synced: number;
  skipped: number;
  errors: RemoteSyncError[];
}

export const manualSyncDto = z.object({
  remotePath: z.string().min(1),
  mediaId: z.number().int().positive(),
  type: z.enum(["movie", "tv"]),
});
export type ManualSyncInput = z.infer<typeof manualSyncDto>;
