import type { IndexerModule } from "./indexer.types";
import type { ModuleRow } from "./module.schema";

/** Map an indexer module row to the shape used by torrent adapters. */
export function moduleToIndexer(row: ModuleRow): IndexerModule {
  const config = (row.config ?? {}) as Record<string, unknown>;

  if (row.type === "jackett" || row.type === "prowlarr") {
    return {
      id: row.id,
      indexerType: row.type,
      indexerUrl: String(config.url ?? ""),
      indexerApiKey: String(config.apiKey ?? ""),
      disabled: !row.enabled,
      manifest: null,
    };
  }

  if (row.type === "stremio") {
    const manifestUrl = String(config.manifestUrl ?? "");
    const baseUrl = String(config.baseUrl ?? manifestUrl.replace(/\/manifest\.json$/, ""));
    return {
      id: row.id,
      indexerType: "stremio",
      indexerUrl: baseUrl,
      indexerApiKey: "",
      disabled: !row.enabled,
      manifest: (config.manifest as IndexerModule["manifest"]) ?? null,
    };
  }

  throw new Error(`Not an indexer module: ${row.type}`);
}
