import type { ModuleType } from "@seedarr/contracts";
import { getCatalogEntryForPreset, getModuleCatalogEntry } from "@seedarr/shared";

import { decrypt } from "@/shared/helpers/crypto.helper";

import type { ModuleRow } from "./module.schema";

const SECRET_KEYS = new Set(["apiKey", "password", "accessToken", "refreshToken", "botToken"]);

export type ModulePublic = Omit<ModuleRow, "config"> & {
  config: Record<string, unknown>;
  label: string;
  description: string;
  tags: string[];
  logo: string | null;
  locked: boolean;
  comingSoon: boolean;
  recommended: boolean;
  configRequired: boolean;
  hasSecrets: boolean;
};

function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return `****${value.slice(-4)}`;
}

function maskModuleConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...config };
  for (const key of Object.keys(out)) {
    if (SECRET_KEYS.has(key) && typeof out[key] === "string" && out[key]) {
      out[key] = maskSecret(out[key] as string);
      out[`has${key[0].toUpperCase()}${key.slice(1)}`] = true;
    }
  }
  return out;
}

function isConfigRequired(type: ModuleType, config: Record<string, unknown>): boolean {
  switch (type) {
    case "tmdb":
      return !config.apiKey && !process.env.TMDB_API_KEY;
    case "subdl":
      return !config.apiKey && !process.env.SUBDL_API_KEY;
    case "jackett":
    case "prowlarr":
      return !config.url || !config.apiKey || config.apiKey === "changeme";
    case "stremio":
      return !config.manifestUrl && !config.preset;
    case "webdav":
    case "ftp":
      return !config.host;
    default:
      return false;
  }
}

function resolveDisplay(row: ModuleRow): { label: string; description: string; tags: string[]; logo: string | null } {
  const entry = getModuleCatalogEntry(row.type);
  const config = (row.config ?? {}) as Record<string, unknown>;

  if (row.type === "stremio") {
    const preset = config.preset as "torrentio" | "comet" | "mediafusion" | undefined;
    if (preset) {
      const presetEntry = getCatalogEntryForPreset(preset);
      return {
        label: presetEntry.label,
        description: presetEntry.description,
        tags: presetEntry.tags,
        logo: presetEntry.logo ?? null,
      };
    }
    const manifest = config.manifest as { name?: string; description?: string; logo?: string } | undefined;
    return {
      label: manifest?.name || entry.label,
      description: manifest?.description || entry.description,
      tags: entry.tags,
      logo: manifest?.logo || entry.logo || null,
    };
  }

  return {
    label: entry.label,
    description: entry.description,
    tags: entry.tags,
    logo: entry.logo ?? null,
  };
}

export function revealAdminSecrets(pub: ModulePublic, raw: Record<string, unknown>): void {
  if (typeof raw.apiKey === "string" && raw.apiKey) {
    pub.config.apiKey = raw.apiKey;
  }
  if (typeof raw.password === "string" && raw.password) {
    try {
      pub.config.password = decrypt(raw.password);
    } catch {
      pub.config.password = raw.password;
    }
  }
}

export function toPublicModule(row: ModuleRow): ModulePublic {
  const entry = getModuleCatalogEntry(row.type);
  const config = (row.config ?? {}) as Record<string, unknown>;
  const display = resolveDisplay(row);
  return {
    ...row,
    config: maskModuleConfig(config),
    label: display.label,
    description: display.description,
    tags: display.tags,
    logo: display.logo,
    locked: Boolean(entry.locked),
    comingSoon: Boolean(entry.comingSoon),
    recommended: Boolean(entry.recommended),
    configRequired: isConfigRequired(row.type, config),
    hasSecrets: Object.keys(config).some((k) => SECRET_KEYS.has(k) && Boolean(config[k])),
  };
}

export function ensureCategory(type: ModuleType): ReturnType<typeof getModuleCatalogEntry>["category"] {
  return getModuleCatalogEntry(type).category;
}
