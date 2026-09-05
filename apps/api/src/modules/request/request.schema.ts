import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

import { media } from "@/modules/media/media.schema";
import { user } from "@/modules/user/user.schema";

export const mediaRequest = sqliteTable(
  "mediaRequest",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId")
      .notNull()
      .references(() => media.id, { onDelete: "cascade" }),
    dismissed: integer("dismissed", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["pending", "validated", "cancelled"] })
      .notNull()
      .default("pending"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("mediaRequest_user_media_unique").on(table.userId, table.mediaId),
    index("mediaRequest_status_idx").on(table.status),
    index("mediaRequest_userId_idx").on(table.userId),
  ],
);

export const mediaRequestRelations = relations(mediaRequest, ({ one }) => ({
  user: one(user, { fields: [mediaRequest.userId], references: [user.id] }),
  media: one(media, { fields: [mediaRequest.mediaId], references: [media.id] }),
}));

export const mediaRequestSelectSchema = createSelectSchema(mediaRequest);
export type MediaRequest = z.infer<typeof mediaRequestSelectSchema>;
