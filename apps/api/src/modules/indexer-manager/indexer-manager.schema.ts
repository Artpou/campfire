import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const indexerTypeEnum = ["prowlarr", "jackett"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

export const indexerManager = sqliteTable("indexerManager", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  indexerType: text("indexer_type", { enum: indexerTypeEnum }).notNull(),
  indexerUrl: text("indexer_url").notNull(),
  indexerApiKey: text("indexer_api_key").notNull(),
});
