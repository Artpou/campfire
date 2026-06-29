import { STREMIO_PRESET_NAMES, STREMIO_PRESETS, type StremioPresetName } from "@seedarr/shared";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";

const indexerManagerSelectSchema = createSelectSchema(indexerManager);
export type IndexerManager = z.infer<typeof indexerManagerSelectSchema>;

export type Indexer = {
  id: string;
  name: string;
  label?: string;
  lang?: string;
  description?: string;
  privacy?: "public" | "semi-private" | "private";
};

export type IndexerManagerWithIndexers = IndexerManager & {
  indexers: Indexer[];
};

const selfHostedSchema = z.object({
  type: z.literal("SELF_HOSTED"),
  indexerType: z.enum(["prowlarr", "jackett"]),
  indexerUrl: z.string().min(1).max(2048),
  indexerApiKey: z.string().min(1).max(256),
});

const stremioAddonSchema = z.object({
  type: z.literal("STREMIO_ADDON"),
  manifestUrl: z.string().url().max(2048),
});

export { STREMIO_PRESETS };
export type PresetName = StremioPresetName;

const presetSchema = z.object({
  type: z.literal("PRESET"),
  preset: z.enum(STREMIO_PRESET_NAMES),
});

export const createIndexerManagerDto = z.discriminatedUnion("type", [
  selfHostedSchema,
  stremioAddonSchema,
  presetSchema,
]);
export type CreateIndexerManagerInput = z.infer<typeof createIndexerManagerDto>;

export const updateIndexerManagerDto = z.object({
  indexerUrl: z.string().max(2048).optional(),
  indexerApiKey: z.string().max(256).optional(),
  manifestUrl: z.string().url().max(2048).optional(),
  disabled: z.boolean().optional(),
});
export type UpdateIndexerManagerInput = z.infer<typeof updateIndexerManagerDto>;
