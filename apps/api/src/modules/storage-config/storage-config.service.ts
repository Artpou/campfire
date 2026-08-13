import type { TestStorageConfigInput, UpsertStorageConfigInput } from "@seedarr/contracts";
import { eq } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import { db } from "@/db/db";
import { decrypt, encrypt } from "./crypto.helper";
import { remoteStorageService } from "./remote-storage.service";
import { storageConfig } from "./storage-config.schema";

export interface StorageConfigResponse {
  id: string;
  enabled: boolean;
  autoTransfer: boolean;
  protocol: string;
  host: string;
  port: number;
  secure: boolean;
  moviePath: string | null;
  tvPath: string | null;
  username: string | null;
  hasPassword: boolean;
  deleteLocalAfterTransfer: boolean;
  diskQuotaGb: number | null;
}

const SINGLETON_ID = "default";

function toResponse(config: {
  id: string;
  enabled: boolean;
  autoTransfer: boolean;
  protocol: string;
  host: string;
  port: number;
  secure: boolean;
  moviePath: string | null;
  tvPath: string | null;
  username: string | null;
  password: string | null;
  deleteLocalAfterTransfer: boolean;
  diskQuotaGb: number | null;
}): StorageConfigResponse {
  return {
    id: config.id,
    enabled: config.enabled,
    autoTransfer: config.autoTransfer,
    protocol: config.protocol ?? "ftp",
    host: config.host,
    port: config.port ?? 21,
    secure: config.secure ?? false,
    moviePath: config.moviePath,
    tvPath: config.tvPath,
    username: config.username,
    hasPassword: !!config.password,
    deleteLocalAfterTransfer: config.deleteLocalAfterTransfer,
    diskQuotaGb: config.diskQuotaGb,
  };
}

export class StorageConfigService {
  async get(): Promise<StorageConfigResponse | null> {
    const config = await db.query.storageConfig.findFirst();
    if (!config) return null;
    return toResponse(config);
  }

  async upsert(input: UpsertStorageConfigInput): Promise<StorageConfigResponse> {
    const existing = await db.query.storageConfig.findFirst();

    const values = {
      id: existing?.id ?? SINGLETON_ID,
      enabled: input.enabled,
      autoTransfer: input.autoTransfer,
      protocol: input.protocol,
      host: input.host,
      port: input.port,
      secure: input.secure,
      moviePath: input.moviePath || null,
      tvPath: input.tvPath || null,
      username: input.username ?? null,
      password: input.password ? encrypt(input.password) : (existing?.password ?? null),
      deleteLocalAfterTransfer: input.deleteLocalAfterTransfer,
      diskQuotaGb: input.diskQuotaGb === undefined ? (existing?.diskQuotaGb ?? null) : input.diskQuotaGb,
      updatedAt: new Date(),
    };

    await db.insert(storageConfig).values(values).onConflictDoUpdate({ target: storageConfig.id, set: values });

    logger.info("STORAGE_CONFIG", `Storage config ${existing ? "updated" : "created"}`);

    return toResponse(values);
  }

  async disconnect(): Promise<StorageConfigResponse> {
    const existing = await db.query.storageConfig.findFirst();
    if (!existing) throw new NotFoundError("Storage config");

    await db
      .update(storageConfig)
      .set({ enabled: false, autoTransfer: false, updatedAt: new Date() })
      .where(eq(storageConfig.id, existing.id));

    logger.info("STORAGE_CONFIG", "Storage config disconnected");
    const updated = await db.query.storageConfig.findFirst();
    if (!updated) throw new NotFoundError("Storage config");
    return toResponse(updated);
  }

  async remove(): Promise<{ success: true }> {
    const existing = await db.query.storageConfig.findFirst();
    if (!existing) throw new NotFoundError("Storage config");

    await db.delete(storageConfig);
    logger.info("STORAGE_CONFIG", "Storage config deleted");
    return { success: true };
  }

  async test(input: TestStorageConfigInput): Promise<{ success: boolean; error?: string }> {
    const existing = await db.query.storageConfig.findFirst();
    const password = input.password || (existing?.password ? decrypt(existing.password) : undefined);

    return remoteStorageService.testConnection({
      protocol: input.protocol,
      host: input.host,
      port: input.port,
      username: input.username,
      password,
      secure: input.secure,
    });
  }
}
