import { STREMIO_PRESET_NAMES } from "@seedarr/shared";
import { z } from "zod";

import { indexerTypeEnum } from "./enums";

const selfHostedSchema = z.object({
  type: z.literal("SELF_HOSTED"),
  indexerType: z.enum(indexerTypeEnum).exclude(["stremio"]),
  indexerUrl: z.string().min(1).max(2048),
  indexerApiKey: z.string().min(1).max(256),
});

const stremioAddonSchema = z.object({
  type: z.literal("STREMIO_ADDON"),
  manifestUrl: z.string().url().max(2048),
});

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
