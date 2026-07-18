import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const storageLocationEnum = ["LOCAL", "REMOTE"] as const;
export type StorageLocation = (typeof storageLocationEnum)[number];

export const storageConfig = sqliteTable("storageConfig", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  protocol: text("protocol").notNull().default("ftp"),
  host: text("host").notNull(),
  port: integer("port").notNull().default(21),
  secure: integer("secure", { mode: "boolean" }).notNull().default(false),
  share: text("share"),
  remotePath: text("remote_path"),
  moviePath: text("movie_path"),
  tvPath: text("tv_path"),
  username: text("username"),
  password: text("password"),
  deleteLocalAfterTransfer: integer("delete_local_after_transfer", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
