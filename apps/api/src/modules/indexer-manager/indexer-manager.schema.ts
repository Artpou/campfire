import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const indexerTypeEnum = ["prowlarr", "jackett", "torrentio"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

export const indexerPrivacyEnum = ["public", "semi-private", "private"] as const;
export type IndexerPrivacy = (typeof indexerPrivacyEnum)[number];

export const indexerManager = sqliteTable("indexerManager", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  indexerType: text("indexer_type", { enum: indexerTypeEnum }).notNull(),
  indexerUrl: text("indexer_url"),
  indexerApiKey: text("indexer_api_key"),
  disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
});

export const indexer = sqliteTable("indexer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  indexerManagerId: text("indexer_manager_id")
    .notNull()
    .references(() => indexerManager.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  label: text("label").notNull(),
  lang: text("lang"),
  privacy: text("privacy", { enum: indexerPrivacyEnum }).notNull().default("public"),
  description: text("description"),
});

export const indexerManagerRelations = relations(indexerManager, ({ many }) => ({
  indexers: many(indexer),
}));

export const indexerRelations = relations(indexer, ({ one }) => ({
  manager: one(indexerManager, { fields: [indexer.indexerManagerId], references: [indexerManager.id] }),
}));
