import type { ModuleType } from "@seedarr/contracts";
import { eq, inArray } from "drizzle-orm";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

import { ForbiddenError, ServiceUnavailableError } from "@/shared/errors/error";

import { db } from "@/db/db";
import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { type ModuleRow, module } from "./module.schema";
import { ensureSystemModules } from "./module.seed";

export type ModuleGuardVariables = {
  moduleRow: ModuleRow;
};

async function findModule(types: ModuleType[]): Promise<ModuleRow | null> {
  await ensureSystemModules();
  if (types.length === 1) {
    return (await db.query.module.findFirst({ where: eq(module.type, types[0]) })) ?? null;
  }
  return (await db.query.module.findFirst({ where: inArray(module.type, types) })) ?? null;
}

/** Require an installed, enabled module of the given type(s). */
export function requireModule(...types: ModuleType[]) {
  return createMiddleware<{ Variables: HonoAuthenticatedVariables & ModuleGuardVariables }>(
    async (c: Context, next: Next) => {
      const row = await findModule(types);
      if (!row) {
        throw new ServiceUnavailableError(`${types.join("/")} module is not installed`);
      }
      if (!row.enabled) {
        throw new ForbiddenError(`${types.join("/")} module is disabled`);
      }
      c.set("moduleRow", row);
      await next();
    },
  );
}
