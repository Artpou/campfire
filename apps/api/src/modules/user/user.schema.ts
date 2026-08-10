import { userRoleEnum } from "@seedarr/contracts";
import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export type { UserRole } from "@seedarr/contracts";
export { userRoleEnum };

export const user = sqliteTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    pseudo: text("pseudo"),
    avatarPath: text("avatar_path"),
    role: text("role", { enum: userRoleEnum }).notNull().default("viewer"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("user_single_owner").on(table.role).where(sql`${table.role} = 'owner'`)],
);

// --- Drizzle-Zod derived schemas ---

export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);

type UserBase = Omit<z.infer<typeof userSelectSchema>, "password">;
export type User = UserBase;
export type NewUser = z.input<typeof userInsertSchema>;
