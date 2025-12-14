import { sql } from "drizzle-orm";
import { text, timestamp } from "drizzle-orm/pg-core";

// Base entity fields (uses text ID, no soft delete)
export const entity = {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
};

// Entity fields with soft delete support (extends entity)
export const entitySoftDelete = {
  ...entity,
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
