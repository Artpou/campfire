import { relations } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { download } from "@/modules/download/download.schema";
import { user } from "@/modules/user/user.schema";

export const mediaTypeEnum = ["movie", "tv"] as const;
export type MediaType = (typeof mediaTypeEnum)[number];

export const media = sqliteTable("media", {
  id: integer("id").primaryKey(),
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

export const watchProgress = sqliteTable(
  "watchProgress",
  {
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    downloadId: text("downloadId"),
    position: integer("position").notNull().default(0),
    duration: integer("duration").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mediaId] })],
);

// --- Relations ---

export const mediaRelations = relations(media, ({ many }) => ({
  likes: many(userLikes),
  watchList: many(userWatchList),
  downloads: many(download),
  progress: many(watchProgress),
}));

export const userLikesRelations = relations(userLikes, ({ one }) => ({
  media: one(media, { fields: [userLikes.mediaId], references: [media.id] }),
}));

export const userWatchListRelations = relations(userWatchList, ({ one }) => ({
  media: one(media, { fields: [userWatchList.mediaId], references: [media.id] }),
}));

export const watchProgressRelations = relations(watchProgress, ({ one }) => ({
  media: one(media, { fields: [watchProgress.mediaId], references: [media.id] }),
}));

export const torrentDownloadRelations = relations(download, ({ one }) => ({
  media: one(media, { fields: [download.mediaId], references: [media.id] }),
}));
