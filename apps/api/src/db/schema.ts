import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Enum for indexer types
export const indexerTypeEnum = ["prowlarr", "jackett"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

// Enum for user roles
export const userRoleEnum = ["owner", "admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoleEnum)[number];

// User table - Custom auth with username/password
export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // format: "salt:hash"
  role: text("role", { enum: userRoleEnum }).notNull().default("viewer"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// IndexerManager table - Store global indexer configurations (one per type)
export const indexerManager = sqliteTable("indexerManager", {
  name: text("name", { enum: indexerTypeEnum }).primaryKey(),
  apiKey: text("apiKey"),
  baseUrl: text("baseUrl"),
  selected: integer("selected", { mode: "boolean" })
    .notNull()
    .$default(() => false),
});

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
  original_title: text("original_title"),
  sanitize_title: text("sanitize_title"),
  original_language: text("original_language"),
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
    createdAt: integer("createdAt", { mode: "timestamp" })
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
    createdAt: integer("createdAt", { mode: "timestamp" })
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
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

// Torrent download status enum
export const torrentStatusEnum = [
  "queued",
  "downloading",
  "completed",
  "failed",
  "paused",
] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

// TorrentDownload table - Track user torrent downloads
// Note: Volatile data (progress, speeds, peers) comes from WebTorrent live, not DB
export const torrentDownload = sqliteTable("torrentDownload", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  mediaId: integer("mediaId").references(() => media.id, { onDelete: "set null" }), // Optional link to media

  // Torrent metadata (for restoration after restart)
  magnetUri: text("magnetUri").notNull(),
  infoHash: text("infoHash").notNull().unique(),
  name: text("name").notNull(),
  size: integer("size").notNull().default(0), // Total size (fixed once known)

  // Status and history
  status: text("status", { enum: torrentStatusEnum }).notNull().default("queued"),
  savePath: text("savePath"), // Relative path in downloads directory

  // Torrent source metadata
  origin: text("origin"), // Tracker name (e.g., "The Pirate Bay")
  quality: text("quality"), // Quality tier (SD, HD, 2K, 4K)
  language: text("language"), // Content language

  // Timestamps
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  startedAt: integer("startedAt", { mode: "timestamp" }),
  completedAt: integer("completedAt", { mode: "timestamp" }),

  // Error handling
  error: text("error"),
});
