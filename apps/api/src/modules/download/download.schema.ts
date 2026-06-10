import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "@/modules/user/user.schema";

export const torrentStatusEnum = ["queued", "downloading", "completed", "failed", "paused"] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

export const torrentDownload = sqliteTable("torrentDownload", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  mediaId: integer("mediaId"),

  magnetUri: text("magnetUri").notNull(),
  infoHash: text("infoHash").unique(),
  name: text("name").notNull(),
  size: integer("size").notNull().default(0),

  status: text("status", { enum: torrentStatusEnum }).notNull().default("queued"),
  savePath: text("savePath"),

  origin: text("origin"),
  quality: text("quality"),
  language: text("language"),

  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  startedAt: integer("startedAt", { mode: "timestamp" }),
  completedAt: integer("completedAt", { mode: "timestamp" }),

  error: text("error"),
});
