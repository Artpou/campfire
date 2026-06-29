import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "@/modules/user/user.schema";

export const mediaToken = sqliteTable(
  "media_token",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("media_token_userId_idx").on(table.userId), index("media_token_createdAt_idx").on(table.createdAt)],
);
