import { z } from "zod";

import { mediaTypeEnum } from "./enums";

/** UI grouping for filters. Derived from type via MODULE_CATALOG. */
export const moduleCategoryEnum = ["system", "indexer", "social", "storage", "notification"] as const;
export type ModuleCategory = (typeof moduleCategoryEnum)[number];

/** Concrete module kinds. `stremio` may be installed multiple times. */
export const moduleTypeEnum = [
  "tmdb",
  "subdl",
  "jackett",
  "prowlarr",
  "stremio",
  "letterboxd",
  "trakt",
  "webdav",
  "ftp",
  "smb",
  "discord",
  "telegram",
  "email",
] as const;
export type ModuleType = (typeof moduleTypeEnum)[number];

export const stremioManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
  catalogs: z.array(z.unknown()).optional(),
  resources: z.array(z.unknown()).optional(),
  types: z.array(z.string()).optional(),
  background: z.string().optional(),
  logo: z.string().optional(),
  behaviorHints: z
    .object({
      configurable: z.boolean().optional(),
      configurationRequired: z.boolean().optional(),
    })
    .optional(),
});
export type StremioManifestConfig = z.infer<typeof stremioManifestSchema>;

const tmdbConfigFields = z.object({
  apiKey: z.string().min(1).max(256).optional(),
});

const subdlConfigFields = z.object({
  apiKey: z.string().min(1).max(256).optional(),
});

const jackettConfigFields = z.object({
  url: z.string().url().max(2048),
  apiKey: z.string().min(1).max(256),
});

const prowlarrConfigFields = z.object({
  url: z.string().url().max(2048),
  apiKey: z.string().min(1).max(256),
});

const stremioConfigFields = z.object({
  manifestUrl: z.string().url().max(2048),
  baseUrl: z.string().url().max(2048).optional(),
  manifest: stremioManifestSchema.optional(),
  preset: z.enum(["torrentio", "comet", "mediafusion"]).optional(),
});

const letterboxdConfigFields = z.object({
  username: z.string().max(128).optional(),
});

const storageBaseFields = {
  host: z.string().max(512).default(""),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  username: z.string().max(256).optional(),
  password: z.string().max(512).optional(),
  moviePath: z.string().max(1024).optional(),
  tvPath: z.string().max(1024).optional(),
  autoTransfer: z.boolean().default(false),
  deleteLocalAfterTransfer: z.boolean().default(false),
  diskQuotaGb: z.number().int().positive().optional(),
};

const webdavConfigFields = z.object(storageBaseFields);
const ftpConfigFields = z.object(storageBaseFields);

const comingSoonConfigFields = z.object({});

/** Stored JSON config — no redundant `type` field (lives on the module row). */
export type ModuleConfig =
  | z.infer<typeof tmdbConfigFields>
  | z.infer<typeof subdlConfigFields>
  | z.infer<typeof jackettConfigFields>
  | z.infer<typeof prowlarrConfigFields>
  | z.infer<typeof stremioConfigFields>
  | z.infer<typeof letterboxdConfigFields>
  | z.infer<typeof webdavConfigFields>
  | z.infer<typeof ftpConfigFields>
  | z.infer<typeof comingSoonConfigFields>;

export const moduleConfigFieldsByType = {
  tmdb: tmdbConfigFields,
  subdl: subdlConfigFields,
  jackett: jackettConfigFields,
  prowlarr: prowlarrConfigFields,
  stremio: stremioConfigFields,
  letterboxd: letterboxdConfigFields,
  webdav: webdavConfigFields,
  ftp: ftpConfigFields,
  trakt: comingSoonConfigFields,
  smb: comingSoonConfigFields,
  discord: comingSoonConfigFields,
  telegram: comingSoonConfigFields,
  email: comingSoonConfigFields,
} as const;

export function parseModuleConfig(type: ModuleType, config: unknown): ModuleConfig {
  const schema = moduleConfigFieldsByType[type];
  return schema.parse(config ?? {}) as ModuleConfig;
}

/** Build PATCH config from form values. Empty system apiKey clears the override (env fallback). */
export function buildModulePatchConfig(
  type: ModuleType,
  values: Record<string, unknown>,
  _saved: Record<string, unknown> = {},
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  switch (type) {
    case "tmdb":
    case "subdl": {
      const apiKey = values.apiKey;
      if (typeof apiKey === "string") {
        if (apiKey.trim() && !apiKey.startsWith("****")) config.apiKey = apiKey.trim();
        else if (!apiKey.trim()) config.apiKey = "";
      }
      break;
    }
    case "jackett":
    case "prowlarr": {
      if (typeof values.url === "string") config.url = values.url.trim();
      const apiKey = values.apiKey;
      if (typeof apiKey === "string" && apiKey && apiKey !== "changeme" && !apiKey.startsWith("****")) {
        config.apiKey = apiKey;
      }
      break;
    }
    case "stremio":
      if (typeof values.manifestUrl === "string") config.manifestUrl = values.manifestUrl.trim();
      break;
    case "letterboxd":
      if (typeof values.username === "string") config.username = values.username.trim() || undefined;
      break;
    case "webdav":
    case "ftp": {
      if (typeof values.host === "string") config.host = values.host.trim();
      if (typeof values.port === "number") config.port = values.port;
      if (typeof values.username === "string") config.username = values.username.trim() || undefined;
      if (typeof values.password === "string" && values.password) config.password = values.password;
      if (typeof values.moviePath === "string") config.moviePath = values.moviePath.trim() || undefined;
      if (typeof values.tvPath === "string") config.tvPath = values.tvPath.trim() || undefined;
      if (typeof values.autoTransfer === "boolean") config.autoTransfer = values.autoTransfer;
      if (typeof values.deleteLocalAfterTransfer === "boolean") {
        config.deleteLocalAfterTransfer = values.deleteLocalAfterTransfer;
      }
      break;
    }
    default:
      break;
  }

  return config;
}

export const createModuleDto = z.discriminatedUnion("type", [
  z.object({ type: z.literal("tmdb"), config: tmdbConfigFields.default({}) }),
  z.object({ type: z.literal("subdl"), config: subdlConfigFields.default({}) }),
  z.object({ type: z.literal("jackett"), config: jackettConfigFields }),
  z.object({ type: z.literal("prowlarr"), config: prowlarrConfigFields }),
  z.object({
    type: z.literal("stremio"),
    config: z.union([
      z.object({ manifestUrl: z.string().url().max(2048) }),
      z.object({ preset: z.enum(["torrentio", "comet", "mediafusion"]) }),
    ]),
  }),
  z.object({ type: z.literal("letterboxd"), config: letterboxdConfigFields.default({}) }),
  z.object({
    type: z.literal("webdav"),
    config: webdavConfigFields.partial().default({
      host: "",
      port: 443,
      secure: true,
      autoTransfer: false,
      deleteLocalAfterTransfer: false,
    }),
  }),
  z.object({
    type: z.literal("ftp"),
    config: ftpConfigFields.partial().default({
      host: "",
      port: 21,
      secure: false,
      autoTransfer: false,
      deleteLocalAfterTransfer: false,
    }),
  }),
]);
export type CreateModuleInput = z.infer<typeof createModuleDto>;

export const updateModuleDto = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateModuleInput = z.infer<typeof updateModuleDto>;

export const moduleIdParamDto = z.object({
  id: z.string().min(1),
});

/** Optional draft config for test-connection (merged with saved secrets). */
export const moduleTestDto = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
});
export type ModuleTestInput = z.infer<typeof moduleTestDto>;

export const manualSyncDto = z.object({
  remotePath: z.string().min(1),
  mediaId: z.number().int().positive(),
  type: z.enum(mediaTypeEnum),
});
export type ManualSyncInput = z.infer<typeof manualSyncDto>;
