import { type ModuleConfig, moduleCategoryEnum, moduleTypeEnum } from "@seedarr/contracts";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export const module = sqliteTable("module", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type", { enum: moduleTypeEnum }).notNull(),
  category: text("category", { enum: moduleCategoryEnum }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  config: text("config", { mode: "json" }).$type<ModuleConfig>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const moduleSelectSchema = createSelectSchema(module);
export type ModuleRow = z.infer<typeof moduleSelectSchema>;
