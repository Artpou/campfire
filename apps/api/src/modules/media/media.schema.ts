import { mediaTypeEnum } from "@seedarr/contracts";
import { relations } from "drizzle-orm";
import { type AnySQLiteColumn, index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import { download } from "@/modules/download/download.schema";
import { user } from "@/modules/user/user.schema";

export type { MediaType } from "@seedarr/contracts";
export { mediaTypeEnum };

export const media = sqliteTable("media", {
  id: integer("id").primaryKey(),
  imdbId: text("imdb_id").notNull(),
  type: text("type", { enum: mediaTypeEnum }).notNull(),
  title: text("title").notNull(),
  original_title: text("original_title"),
  sanitize_title: text("sanitize_title"),
  original_language: text("original_language"),
  overview: text("overview"),
  poster_path: text("poster_path"),
  vote_average: real("vote_average"),
  release_date: text("release_date"),
  duration: integer("duration"),
  seasons_number: integer("seasons_number"),
  backdrop_path: text("backdrop_path"),
  categories: text("categories"),
});

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

/** User rating (0–10) + optional comment — Letterboxd-compatible scale. */
export const userReviews = sqliteTable(
  "userReviews",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    score: real("score").notNull(),
    comment: text("comment"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

export const watchProgress = sqliteTable(
  "watchProgress",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    /** Lazy `() => download.id` breaks the circular import with download.schema. */
    downloadId: text("downloadId").references((): AnySQLiteColumn => download.id, { onDelete: "set null" }),
    position: integer("position").notNull().default(0),
    duration: integer("duration").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaId] }),
    index("watchProgress_downloadId_idx").on(table.downloadId),
  ],
);

// --- Relations ---

export const userLikesRelations = relations(userLikes, ({ one }) => ({
  media: one(media, { fields: [userLikes.mediaId], references: [media.id] }),
}));

export const userWatchListRelations = relations(userWatchList, ({ one }) => ({
  media: one(media, { fields: [userWatchList.mediaId], references: [media.id] }),
}));

export const userReviewsRelations = relations(userReviews, ({ one }) => ({
  media: one(media, { fields: [userReviews.mediaId], references: [media.id] }),
}));

export const watchProgressRelations = relations(watchProgress, ({ one }) => ({
  media: one(media, { fields: [watchProgress.mediaId], references: [media.id] }),
}));

// --- Drizzle-Zod derived schemas ---

export const mediaInsertSchema = createInsertSchema(media);
export type MediaInsert = z.infer<typeof mediaInsertSchema>;

export const mediaSelectSchema = createSelectSchema(media);
export type MediaSelect = z.infer<typeof mediaSelectSchema>;
