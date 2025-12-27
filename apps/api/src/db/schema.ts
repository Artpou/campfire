import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// Enum for indexer types
export const indexerTypeEnum = ["prowlarr", "jackett"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

// User table - Custom auth with username/password
export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // format: "salt:hash"
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// IndexerManager table - Store user-specific indexer configurations
export const indexerManager = sqliteTable(
  "indexerManager",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name", { enum: indexerTypeEnum }).notNull(),
    apiKey: text("apiKey"),
    baseUrl: text("baseUrl"),
    selected: integer("selected", { mode: "boolean" })
      .notNull()
      .$default(() => false),
  },
  (table) => ({
    userIdName: unique().on(table.userId, table.name),
  }),
);

// Session table - Store user sessions for authentication persistence
export const session = sqliteTable("session", {
  token: text("token").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Export types
export type User = Omit<typeof user.$inferSelect, "password">;
export type NewUser = typeof user.$inferInsert;
export type IndexerManager = typeof indexerManager.$inferSelect;
export type NewIndexerManager = typeof indexerManager.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
