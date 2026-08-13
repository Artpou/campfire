import { z } from "zod";

import { storageProtocolEnum } from "./enums";

export const upsertStorageConfigDto = z.object({
  enabled: z.boolean(),
  autoTransfer: z.boolean().default(false),
  protocol: z.enum(storageProtocolEnum),
  host: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  moviePath: z.string().max(1024).optional(),
  tvPath: z.string().max(1024).optional(),
  username: z.string().max(256).optional(),
  password: z.string().max(256).optional(),
  deleteLocalAfterTransfer: z.boolean().default(false),
  diskQuotaGb: z.number().positive().max(1_000_000).nullable().optional(),
});
export type UpsertStorageConfigInput = z.infer<typeof upsertStorageConfigDto>;

export const testStorageConfigDto = z.object({
  protocol: z.enum(storageProtocolEnum),
  host: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  username: z.string().max(256).optional(),
  password: z.string().max(256).optional(),
});
export type TestStorageConfigInput = z.infer<typeof testStorageConfigDto>;
