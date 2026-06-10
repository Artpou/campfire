import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userRoleEnum = ["owner", "admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoleEnum)[number];

export const user = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoleEnum }).notNull().default("viewer"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
