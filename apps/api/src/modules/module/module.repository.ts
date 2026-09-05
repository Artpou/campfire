import type { ModuleType } from "@seedarr/contracts";
import { and, eq, inArray, ne } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { type ModuleRow, module } from "@/modules/module/module.schema";

export const moduleRepository = {
  find: async (id: string): Promise<ModuleRow | undefined> => {
    return (await db.query.module.findFirst({ where: eq(module.id, id) })) ?? undefined;
  },

  get: async (id: string): Promise<ModuleRow> => {
    const row = await moduleRepository.find(id);
    if (!row) throw new NotFoundError("Module");
    return row;
  },

  findByType: async (type: ModuleType): Promise<ModuleRow | undefined> => {
    return (await db.query.module.findFirst({ where: eq(module.type, type) })) ?? undefined;
  },

  findFirstByTypes: async (types: ModuleType[]): Promise<ModuleRow | undefined> => {
    if (types.length === 1) return moduleRepository.findByType(types[0]);
    return (await db.query.module.findFirst({ where: inArray(module.type, types) })) ?? undefined;
  },

  findFirstByCategory: async (category: ModuleRow["category"]): Promise<ModuleRow | undefined> => {
    return (await db.query.module.findFirst({ where: eq(module.category, category) })) ?? undefined;
  },

  findEnabledByCategory: async (category: ModuleRow["category"]): Promise<ModuleRow | undefined> => {
    return (
      (await db.query.module.findFirst({
        where: and(eq(module.category, category), eq(module.enabled, true)),
      })) ?? undefined
    );
  },

  listAll: async (): Promise<ModuleRow[]> => {
    return db.select().from(module);
  },

  listByCategory: async (category: ModuleRow["category"]): Promise<ModuleRow[]> => {
    return db.query.module.findMany({ where: eq(module.category, category) });
  },

  existsByType: async (type: ModuleType, excludeId?: string): Promise<boolean> => {
    const rows = await db
      .select({ id: module.id })
      .from(module)
      .where(excludeId ? and(eq(module.type, type), ne(module.id, excludeId)) : eq(module.type, type))
      .limit(1);
    return rows.length > 0;
  },

  getEnabledStorageModuleId: async (): Promise<string | null> => {
    const row = await moduleRepository.findEnabledByCategory("storage");
    return row?.id ?? null;
  },

  listDisabledStorageModuleIds: async (): Promise<string[]> => {
    const rows = await db
      .select({ id: module.id })
      .from(module)
      .where(and(eq(module.category, "storage"), eq(module.enabled, false)));
    return rows.map((row) => row.id);
  },

  getConfig: async <T extends Record<string, unknown>>(type: ModuleType): Promise<T | undefined> => {
    const row = await moduleRepository.findByType(type);
    return row?.config as T | undefined;
  },

  insert: async (values: typeof module.$inferInsert): Promise<ModuleRow> => {
    const [row] = await db.insert(module).values(values).returning();
    if (!row) throw new NotFoundError("Module");
    return row;
  },

  update: async (id: string, set: Partial<typeof module.$inferInsert>): Promise<ModuleRow> => {
    const [row] = await db.update(module).set(set).where(eq(module.id, id)).returning();
    if (!row) throw new NotFoundError("Module");
    return row;
  },

  delete: async (id: string): Promise<void> => {
    await db.delete(module).where(eq(module.id, id));
  },
};
