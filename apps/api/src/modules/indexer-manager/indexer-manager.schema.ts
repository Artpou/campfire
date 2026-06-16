import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const indexerTypeEnum = ["prowlarr", "jackett", "stremio"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

export const indexerPrivacyEnum = ["public", "semi-private", "private"] as const;
export type IndexerPrivacy = (typeof indexerPrivacyEnum)[number];

export type StremioManifest = {
  id: string;
  version: string;
  name: string;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: Stremio manifest
  catalogs: any[];
  resources: {
    name: string;
    types: string[];
    idPrefixes?: string[];
  }[];
  types: string[];
  background?: string;
  logo?: string;
  behaviorHints?: {
    configurable?: boolean;
    configurationRequired?: boolean;
  };
};

export const indexerManager = sqliteTable("indexerManager", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  indexerType: text("indexer_type", { enum: indexerTypeEnum }).notNull(),
  indexerUrl: text("indexer_url"),
  indexerApiKey: text("indexer_api_key"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
  manifest: text("metadata", { mode: "json" }).$type<StremioManifest>(),
});
