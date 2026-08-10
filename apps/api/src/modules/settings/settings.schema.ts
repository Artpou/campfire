import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => "default"),
  tmdbApiKey: text("tmdb_api_key"),
  showMediaRatings: integer("show_media_ratings", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
