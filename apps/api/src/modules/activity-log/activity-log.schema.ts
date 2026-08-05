import { activityLogActionEnum, activityLogTypeEnum } from "@seedarr/contracts";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import { user } from "@/modules/user/user.schema";

export type { ActivityLogAction, ActivityLogType } from "@seedarr/contracts";
export { activityLogActionEnum, activityLogTypeEnum };

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

// --- Drizzle-Zod derived schema ---

export const activityLogSelectSchema = createSelectSchema(activityLog);
export type ActivityLog = z.infer<typeof activityLogSelectSchema>;
