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
  indexerUrl: z.string().min(1),
  indexerApiKey: z.string().min(1),
});

const stremioAddonSchema = z.object({
  type: z.literal("STREMIO_ADDON"),
  manifestUrl: z.string().url(),
});

export const STREMIO_PRESETS = {
  torrentio: "https://torrentio.strem.fun/manifest.json",
  comet: "https://comet.elfhosted.com/manifest.json",
  mediafusion: "https://mediafusion.elfhosted.com/manifest.json",
} as const;

export type PresetName = keyof typeof STREMIO_PRESETS;

const presetSchema = z.object({
  type: z.literal("PRESET"),
  preset: z.enum(["torrentio", "comet", "mediafusion"]),
});

export const createIndexerManagerDto = z.discriminatedUnion("type", [
  selfHostedSchema,
  stremioAddonSchema,
  presetSchema,
]);
export type CreateIndexerManagerInput = z.infer<typeof createIndexerManagerDto>;

export const updateIndexerManagerDto = z.object({
  indexerUrl: z.string().optional(),
  indexerApiKey: z.string().optional(),
  manifestUrl: z.string().url().optional(),
  disabled: z.boolean().optional(),
});
export type UpdateIndexerManagerInput = z.infer<typeof updateIndexerManagerDto>;
