import type {
  CreateModuleInput,
  ModuleConfig,
  ModuleTestInput,
  ModuleType,
  UpdateModuleInput,
} from "@seedarr/contracts";
import { parseModuleConfig } from "@seedarr/contracts";
import { getModuleCatalogEntry, STREMIO_PRESETS } from "@seedarr/shared";
import { and, eq, ne } from "drizzle-orm";

import { BadRequestError, ConflictError, NotFoundError } from "@/shared/errors/error";
import { decrypt, encrypt } from "@/shared/helpers/crypto.helper";
import { assertPublicHttpUrl, assertSafeIndexerUrl } from "@/shared/helpers/url.helper";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { invalidateStorageConfigCache } from "@/modules/storage-config/remote/remote-storage.service";
import { invalidateTmdbKeyCache } from "@/modules/tmdb/tmdb-key.query";
import { ensureCategory, type ModulePublic, revealAdminSecrets, toPublicModule } from "./module.helper";
import { type ModuleRow, module } from "./module.schema";
import { ensureSystemModules } from "./module.seed";

type StremioManifest = {
  id: string;
  version: string;
  name: string;
  description?: string;
  logo?: string;
  background?: string;
  behaviorHints?: { configurable?: boolean; configurationRequired?: boolean };
};

const SECRET_KEYS = ["apiKey", "password"] as const;

async function fetchManifest(manifestUrl: string): Promise<StremioManifest> {
  const MAX_REDIRECT_DEPTH = 5;
  let currentUrl = manifestUrl;

  for (let depth = 0; depth <= MAX_REDIRECT_DEPTH; depth++) {
    await assertPublicHttpUrl(currentUrl);
    const response = await fetch(currentUrl, { redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new BadRequestError("Manifest redirect without Location header");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    if (!response.ok) throw new BadRequestError(`Failed to fetch manifest (${response.status})`);
    return (await response.json()) as StremioManifest;
  }
  throw new BadRequestError("Too many redirects while fetching manifest");
}

function deriveBaseUrl(manifestUrl: string): string {
  return manifestUrl.replace(/\/manifest\.json$/, "");
}

function mergeDraftConfig(row: ModuleRow, draft?: Record<string, unknown>): Record<string, unknown> {
  const saved = { ...(row.config as Record<string, unknown>) };
  if (!draft) return saved;

  const merged = { ...saved, ...draft };
  for (const secret of SECRET_KEYS) {
    const incoming = draft[secret];
    if (incoming === undefined || incoming === "" || (typeof incoming === "string" && incoming.startsWith("****"))) {
      const prev = saved[secret];
      if (prev) merged[secret] = prev;
    } else if (secret === "password" && typeof incoming === "string") {
      merged[secret] = incoming;
    }
  }
  return merged;
}

function resolveSecret(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

export class ModuleService extends AuthenticatedService {
  private async assertUnique(type: ModuleType, excludeId?: string): Promise<void> {
    const entry = getModuleCatalogEntry(type);
    if (!entry.unique) return;
    const existing = await db
      .select({ id: module.id })
      .from(module)
      .where(excludeId ? and(eq(module.type, type), ne(module.id, excludeId)) : eq(module.type, type))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictError(`${entry.label} is already installed`);
    }
  }

  async list(): Promise<ModulePublic[]> {
    await ensureSystemModules();
    const rows = await db.select().from(module);
    const isAdmin = this.roleLevel >= ROLE_LEVELS.admin;
    return rows.map((row) => {
      const pub = toPublicModule(row);
      if (!isAdmin && "apiKey" in pub.config) {
        delete pub.config.apiKey;
      }
      return pub;
    });
  }

  async get(id: string): Promise<ModulePublic> {
    await ensureSystemModules();
    const row = await db.query.module.findFirst({ where: eq(module.id, id) });
    if (!row) throw new NotFoundError("Module not found");
    const pub = toPublicModule(row);
    if (this.roleLevel >= ROLE_LEVELS.admin) {
      revealAdminSecrets(pub, row.config as Record<string, unknown>);
    }
    return pub;
  }

  async getRaw(id: string): Promise<ModuleRow> {
    const row = await db.query.module.findFirst({ where: eq(module.id, id) });
    if (!row) throw new NotFoundError("Module not found");
    return row;
  }

  async getByType(type: ModuleType): Promise<ModuleRow | null> {
    await ensureSystemModules();
    return (await db.query.module.findFirst({ where: eq(module.type, type) })) ?? null;
  }

  async listByCategory(category: ModuleRow["category"]): Promise<ModuleRow[]> {
    await ensureSystemModules();
    return db.select().from(module).where(eq(module.category, category));
  }

  async create(input: CreateModuleInput): Promise<ModulePublic> {
    const entry = getModuleCatalogEntry(input.type);
    if (entry.comingSoon) throw new BadRequestError(`${entry.label} is coming soon`);

    await this.assertUnique(input.type);

    let config: ModuleConfig;

    if (input.type === "stremio") {
      const manifestUrl = "preset" in input.config ? STREMIO_PRESETS[input.config.preset] : input.config.manifestUrl;
      const manifest = await fetchManifest(manifestUrl);
      config = parseModuleConfig("stremio", {
        manifestUrl,
        baseUrl: deriveBaseUrl(manifestUrl),
        manifest,
        preset: "preset" in input.config ? input.config.preset : undefined,
      });
    } else if (input.type === "jackett" || input.type === "prowlarr") {
      assertSafeIndexerUrl(input.config.url);
      config = parseModuleConfig(input.type, input.config);
    } else if (input.type === "webdav" || input.type === "ftp") {
      const password = input.config.password ? encrypt(input.config.password) : undefined;
      config = parseModuleConfig(input.type, { ...input.config, password });
    } else {
      config = parseModuleConfig(input.type, input.config);
    }

    if (input.type === "stremio" && "preset" in input.config) {
      const preset = input.config.preset;
      const existing = await this.listByCategory("indexer");
      const presetTaken = existing.some((row) => {
        const cfg = row.config as { preset?: string };
        return row.type === "stremio" && cfg.preset === preset;
      });
      if (presetTaken) throw new ConflictError(`${preset} is already installed`);
    }

    const [row] = await db
      .insert(module)
      .values({
        type: input.type,
        category: ensureCategory(input.type),
        enabled: true,
        config,
      })
      .returning();

    this.invalidateCaches(input.type);
    return toPublicModule(row);
  }

  async update(id: string, input: UpdateModuleInput): Promise<ModulePublic> {
    const row = await this.getRaw(id);
    const entry = getModuleCatalogEntry(row.type);

    if (input.enabled === false && entry.locked) {
      throw new BadRequestError("This module cannot be disabled");
    }

    let nextConfig = row.config as ModuleConfig;
    if (input.config) {
      const merged = mergeDraftConfig(row, input.config);
      if ((row.type === "tmdb" || row.type === "subdl") && input.config.apiKey === "") {
        delete merged.apiKey;
      }
      if (row.type === "stremio" && typeof input.config.manifestUrl === "string") {
        const manifestUrl = input.config.manifestUrl;
        const manifest = await fetchManifest(manifestUrl);
        Object.assign(merged, {
          manifestUrl,
          baseUrl: deriveBaseUrl(manifestUrl),
          manifest,
        });
      }
      if ((row.type === "jackett" || row.type === "prowlarr") && typeof input.config.url === "string") {
        assertSafeIndexerUrl(input.config.url);
      }
      if (
        typeof input.config.password === "string" &&
        input.config.password &&
        !input.config.password.startsWith("****")
      ) {
        merged.password = encrypt(input.config.password);
      }
      nextConfig = parseModuleConfig(row.type, merged);
    }

    const [updated] = await db
      .update(module)
      .set({
        enabled: input.enabled ?? row.enabled,
        config: nextConfig,
        updatedAt: new Date(),
      })
      .where(eq(module.id, id))
      .returning();

    this.invalidateCaches(row.type);
    return toPublicModule(updated);
  }

  async delete(id: string): Promise<{ ok: true }> {
    const row = await this.getRaw(id);
    const entry = getModuleCatalogEntry(row.type);
    if (entry.locked) throw new BadRequestError("This module cannot be uninstalled");
    await db.delete(module).where(eq(module.id, id));
    this.invalidateCaches(row.type);
    return { ok: true };
  }

  private invalidateCaches(type: ModuleType): void {
    if (type === "tmdb") invalidateTmdbKeyCache();
    if (type === "webdav" || type === "ftp") invalidateStorageConfigCache();
  }

  /** Probe using saved DB config (list health badges). */
  async health(id: string): Promise<{ ok: boolean; message?: string }> {
    const row = await this.getRaw(id);
    if (!row.enabled) return { ok: false, message: "Module disabled" };
    return this.probe(row.type, row.config as Record<string, unknown>);
  }

  /** Probe draft config from the configure form (does not persist). */
  async test(id: string, input: ModuleTestInput): Promise<{ ok: boolean; message?: string }> {
    const row = await this.getRaw(id);
    const merged = mergeDraftConfig(row, input.config);
    return this.probe(row.type, merged);
  }

  private async probe(type: ModuleType, config: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
    try {
      switch (type) {
        case "tmdb": {
          const key = (config.apiKey as string) || process.env.TMDB_API_KEY;
          if (!key) return { ok: false, message: "API key missing" };
          const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`);
          return res.ok ? { ok: true } : { ok: false, message: `TMDB ${res.status}` };
        }
        case "subdl": {
          const key = (config.apiKey as string) || process.env.SUBDL_API_KEY;
          if (!key) return { ok: false, message: "API key missing" };
          const res = await fetch(
            `https://api.subdl.com/api/v1/subtitles?api_key=${encodeURIComponent(key)}&film_name=test`,
          );
          return res.ok || res.status === 404 ? { ok: true } : { ok: false, message: `SUBDL ${res.status}` };
        }
        case "jackett":
        case "prowlarr": {
          const url = String(config.url || "").replace(/\/$/, "");
          const apiKey = String(config.apiKey || "");
          if (!url || !apiKey || apiKey === "changeme") return { ok: false, message: "Configuration incomplete" };
          assertSafeIndexerUrl(url);
          const probe =
            type === "jackett"
              ? `${url}/api/v2.0/indexers/all/results/torznab/api?apikey=${encodeURIComponent(apiKey)}&t=caps`
              : `${url}/api/v1/health?apikey=${encodeURIComponent(apiKey)}`;
          const res = await fetch(probe, { signal: AbortSignal.timeout(8000) });
          return res.ok || res.status === 401 || res.status === 400
            ? { ok: true }
            : { ok: false, message: `HTTP ${res.status}` };
        }
        case "stremio": {
          const manifestUrl = String(config.manifestUrl || "");
          if (!manifestUrl) return { ok: false, message: "Manifest URL missing" };
          await assertPublicHttpUrl(manifestUrl);
          const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(8000) });
          return res.ok ? { ok: true } : { ok: false, message: `HTTP ${res.status}` };
        }
        case "webdav":
        case "ftp": {
          const host = String(config.host || "");
          if (!host) return { ok: false, message: "Host missing" };
          const { remoteStorageService } = await import("@/modules/storage-config/remote/remote-storage.service");
          const result = await remoteStorageService.testConnection({
            protocol: type,
            host,
            port: Number(config.port) || (type === "webdav" ? 443 : 21),
            username: typeof config.username === "string" ? config.username : null,
            password: resolveSecret(config.password),
            secure: Boolean(config.secure),
          });
          return result.success ? { ok: true } : { ok: false, message: result.error || "Connection failed" };
        }
        case "letterboxd":
          return { ok: true };
        default:
          return { ok: true };
      }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Health check failed" };
    }
  }
}
