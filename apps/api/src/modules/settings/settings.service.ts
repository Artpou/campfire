import type { UpsertSettingsInput } from "@seedarr/contracts";

import { logger } from "@/shared/helpers/logger.helper";

import { db } from "@/db/db";
import { settings } from "./settings.schema";

export interface SettingsResponse {
  tmdbApiKey: string | null;
  showMediaRatings: boolean;
}

export interface SettingsUiResponse {
  showMediaRatings: boolean;
}

const SINGLETON_ID = "default";

function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `****${key.slice(-4)}`;
}

export class SettingsService {
  async get(): Promise<SettingsResponse> {
    const row = await db.query.settings.findFirst();
    return {
      tmdbApiKey: maskApiKey(row?.tmdbApiKey ?? null),
      showMediaRatings: row?.showMediaRatings ?? false,
    };
  }

  async getUi(): Promise<SettingsUiResponse> {
    const row = await db.query.settings.findFirst();
    return {
      showMediaRatings: row?.showMediaRatings ?? false,
    };
  }

  async upsert(input: UpsertSettingsInput): Promise<SettingsResponse> {
    const existing = await db.query.settings.findFirst();

    const values = {
      id: existing?.id ?? SINGLETON_ID,
      tmdbApiKey: input.tmdbApiKey !== undefined ? input.tmdbApiKey || null : (existing?.tmdbApiKey ?? null),
      showMediaRatings:
        input.showMediaRatings !== undefined ? input.showMediaRatings : (existing?.showMediaRatings ?? false),
      updatedAt: new Date(),
    };

    await db.insert(settings).values(values).onConflictDoUpdate({ target: settings.id, set: values });

    logger.info("SETTINGS", `Settings ${existing ? "updated" : "created"}`);

    return {
      tmdbApiKey: maskApiKey(values.tmdbApiKey),
      showMediaRatings: values.showMediaRatings,
    };
  }

  /** True only when a TMDB key is saved in settings (no .env fallback). */
  async isTmdbKeyConfigured(): Promise<boolean> {
    const row = await db.query.settings.findFirst();
    return !!row?.tmdbApiKey;
  }
}
