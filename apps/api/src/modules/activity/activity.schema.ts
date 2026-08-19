import { activityActionEnum, activityTypeEnum } from "@seedarr/contracts";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import { media } from "@/modules/media/media.schema";
import { module } from "@/modules/module/module.schema";
import { user } from "@/modules/user/user.schema";

export type { ActivityAction, ActivityType } from "@seedarr/contracts";
export { activityActionEnum, activityTypeEnum };

export const activityLog = sqliteTable(
  "activityLog",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    mediaId: integer("media_id").references(() => media.id, { onDelete: "set null" }),
    moduleId: text("module_id").references(() => module.id, { onDelete: "set null" }),
    type: text("type", { enum: activityTypeEnum }).notNull(),
    action: text("action", { enum: activityActionEnum }).notNull(),
    metadata: text("metadata"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("activityLog_userId_idx").on(table.userId),
    index("activityLog_mediaId_idx").on(table.mediaId),
    index("activityLog_moduleId_idx").on(table.moduleId),
    index("activityLog_createdAt_idx").on(table.createdAt),
  ],
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
  media: one(media, { fields: [activityLog.mediaId], references: [media.id] }),
  module: one(module, { fields: [activityLog.moduleId], references: [module.id] }),
}));

export const activitySelectSchema = createSelectSchema(activityLog);
export type Activity = z.infer<typeof activitySelectSchema>;
