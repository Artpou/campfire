import { type ModuleConfig, type ModuleType, moduleConfigFieldsByType } from "@seedarr/contracts";

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
      if (typeof values.secure === "boolean") config.secure = values.secure;
      if (type === "ftp" && typeof values.allowSelfSigned === "boolean") {
        config.allowSelfSigned = values.allowSelfSigned;
      }
      if (typeof values.diskQuotaGb === "number" && Number.isFinite(values.diskQuotaGb) && values.diskQuotaGb > 0) {
        config.diskQuotaGb = Math.trunc(values.diskQuotaGb);
      } else {
        config.diskQuotaGb = undefined;
      }
      break;
    }
    default:
      break;
  }

  return config;
}
