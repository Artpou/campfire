import { storageProtocolEnum } from "@seedarr/contracts";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export type { StorageProtocol } from "@seedarr/contracts";
export { storageProtocolEnum };

export const storageConfig = sqliteTable("storageConfig", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  protocol: text("protocol", { enum: storageProtocolEnum }).notNull().default("ftp"),
  host: text("host").notNull(),
  port: integer("port").notNull().default(21),
  secure: integer("secure", { mode: "boolean" }).notNull().default(false),
  moviePath: text("movie_path"),
  tvPath: text("tv_path"),
  username: text("username"),
  password: text("password"),
  deleteLocalAfterTransfer: integer("delete_local_after_transfer", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// --- Drizzle-Zod derived schema ---

export const storageConfigSelectSchema = createSelectSchema(storageConfig);
export type StorageConfig = z.infer<typeof storageConfigSelectSchema>;
