import { boolean, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { entity } from "./shared.schema";

// User table - uses hard delete, compatible with Better Auth
export const users = pgTable("users", {
  ...entity,
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  password: varchar("password", { length: 255 }),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
