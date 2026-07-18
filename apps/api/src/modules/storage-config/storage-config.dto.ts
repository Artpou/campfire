import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { storageProtocolEnum } from "./adapters/storage.adapter";
import { storageConfig } from "./storage-config.schema";

export const storageConfigSelectSchema = createSelectSchema(storageConfig);
export type StorageConfig = z.infer<typeof storageConfigSelectSchema>;

export const upsertStorageConfigDto = z.object({
  enabled: z.boolean(),
  protocol: z.enum(storageProtocolEnum),
  host: z.string().min(1).max(256),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  moviePath: z.string().max(1024).optional(),
  tvPath: z.string().max(1024).optional(),
  username: z.string().max(256).optional(),
  password: z.string().max(256).optional(),
  deleteLocalAfterTransfer: z.boolean().default(false),
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

export interface StorageConfigResponse {
  id: string;
  enabled: boolean;
  protocol: string;
  host: string;
  port: number;
  secure: boolean;
  moviePath: string | null;
  tvPath: string | null;
  username: string | null;
  hasPassword: boolean;
  deleteLocalAfterTransfer: boolean;
}
