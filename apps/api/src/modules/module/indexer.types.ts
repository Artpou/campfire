import type { IndexerType } from "@seedarr/contracts";

type StremioManifest = {
  id: string;
  version: string;
  name: string;
  description: string;
  catalogs: unknown[];
  resources: { name: string; types: string[]; idPrefixes?: string[] }[];
  types: string[];
  background?: string;
  logo?: string;
  behaviorHints?: { configurable?: boolean; configurationRequired?: boolean };
};

/** Runtime shape consumed by torrent adapters (backed by `module` rows). */
export type IndexerModule = {
  id: string;
  indexerType: IndexerType;
  indexerUrl: string;
  indexerApiKey: string;
  disabled: boolean;
  manifest: StremioManifest | null;
};

export type Indexer = {
  id: string;
  name: string;
  label?: string;
  privacy?: "public" | "semi-private" | "private";
};

export type IndexerModuleWithIndexers = IndexerModule & { indexers: Indexer[] };
