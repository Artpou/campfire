import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "@/modules/user/user.schema";

export const activityLogTypeEnum = ["INFO", "SUCCESS", "WARNING", "ERROR"] as const;
export type ActivityLogType = (typeof activityLogTypeEnum)[number];

export const activityLogActionEnum = [
  "USER_LOGIN",
  "USER_CREATE",
  "USER_LOGOUT",
  "MEDIA_SEARCH",
  "STREAM_START",
  "DOWNLOAD_START",
  "DOWNLOAD_PAUSE",
  "DOWNLOAD_RESUME",
  "DOWNLOAD_DELETE",
  "DOWNLOAD_COMPLETE",
  "INDEXER_ADD",
  "INDEXER_DELETE",
  "SYSTEM_ERROR",
] as const;
export type ActivityLogAction = (typeof activityLogActionEnum)[number];

export const activityLog = sqliteTable(
  "activityLog",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    type: text("type", { enum: activityLogTypeEnum }).notNull(),
    action: text("action", { enum: activityLogActionEnum }).notNull(),
    title: text("title").notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("activityLog_userId_idx").on(table.userId), index("activityLog_createdAt_idx").on(table.createdAt)],
);
