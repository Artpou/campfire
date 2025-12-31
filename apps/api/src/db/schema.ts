import { integer, primaryKey, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

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

// Media types enum
export const mediaTypeEnum = ["movie", "tv"] as const;
export type MediaType = (typeof mediaTypeEnum)[number];

// Media table - Store movies/TV shows from TMDB
export const media = sqliteTable("media", {
  id: integer("id").primaryKey(), // TMDB ID
  type: text("type", { enum: mediaTypeEnum }).notNull(),
  title: text("title").notNull(),
  overview: text("overview"),
  poster_path: text("poster_path"),
  vote_average: real("vote_average"),
  release_date: text("release_date"), // ISO date string
});

// UserMedia join table - Track user viewing history
export const userMedia = sqliteTable(
  "userMedia",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    viewedAt: integer("viewedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

// UserLikes join table - Track user's liked media
export const userLikes = sqliteTable(
  "userLikes",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    likedAt: integer("likedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

// UserWatchList join table - Track user's watch list
export const userWatchList = sqliteTable(
  "userWatchList",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    addedAt: integer("addedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

// Export types
export type User = Omit<typeof user.$inferSelect, "password">;
export type NewUser = typeof user.$inferInsert;
export type IndexerManager = typeof indexerManager.$inferSelect;
export type NewIndexerManager = typeof indexerManager.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type UserMedia = typeof userMedia.$inferSelect;
export type NewUserMedia = typeof userMedia.$inferInsert;
export type UserLikes = typeof userLikes.$inferSelect;
export type NewUserLikes = typeof userLikes.$inferInsert;
export type UserWatchList = typeof userWatchList.$inferSelect;
export type NewUserWatchList = typeof userWatchList.$inferInsert;
