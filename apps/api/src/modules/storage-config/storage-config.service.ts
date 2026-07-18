import { db } from "@/db/db";
import { NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import type { StorageProtocol } from "./adapters/storage.adapter";
import { decrypt, encrypt } from "./crypto.helper";
import { remoteStorageService } from "./remote-storage.service";
import type { StorageConfigResponse, TestStorageConfigInput, UpsertStorageConfigInput } from "./storage-config.dto";
import { storageConfig } from "./storage-config.schema";

const SINGLETON_ID = "default";

export class StorageConfigService {
  async get(): Promise<StorageConfigResponse | null> {
    const config = await db.query.storageConfig.findFirst();
    if (!config) return null;

    return {
      id: config.id,
      enabled: config.enabled,
      protocol: config.protocol ?? "ftp",
      host: config.host,
      port: config.port ?? 21,
      secure: config.secure ?? false,
      moviePath: config.moviePath,
      tvPath: config.tvPath,
      username: config.username,
      hasPassword: !!config.password,
      deleteLocalAfterTransfer: config.deleteLocalAfterTransfer,
    };
  }

  async upsert(input: UpsertStorageConfigInput): Promise<StorageConfigResponse> {
    const existing = await db.query.storageConfig.findFirst();

    const values = {
      id: existing?.id ?? SINGLETON_ID,
      enabled: input.enabled,
      protocol: input.protocol,
      host: input.host,
      port: input.port,
      secure: input.secure,
      moviePath: input.moviePath || null,
      tvPath: input.tvPath || null,
      username: input.username ?? null,
      password: input.password ? encrypt(input.password) : (existing?.password ?? null),
      deleteLocalAfterTransfer: input.deleteLocalAfterTransfer,
      updatedAt: new Date(),
    };

    await db.insert(storageConfig).values(values).onConflictDoUpdate({ target: storageConfig.id, set: values });

    logger.info("STORAGE_CONFIG", `Storage config ${existing ? "updated" : "created"}`);

    return {
      id: values.id,
      enabled: values.enabled,
      protocol: values.protocol,
      host: values.host,
      port: values.port,
      secure: values.secure,
      moviePath: values.moviePath,
      tvPath: values.tvPath,
      username: values.username,
      hasPassword: !!values.password,
      deleteLocalAfterTransfer: values.deleteLocalAfterTransfer,
    };
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
      protocol: input.protocol as StorageProtocol,
      host: input.host,
      port: input.port,
      username: input.username,
      password,
      secure: input.secure,
    });
  }
}
