import type { ModuleType } from "@seedarr/contracts";
import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";

import { ForbiddenError, ServiceUnavailableError } from "@/shared/errors/error";

import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { moduleRepository } from "@/modules/module/module.repository";
import type { ModuleRow } from "./module.schema";

export type ModuleGuardVariables = {
  moduleRow: ModuleRow;
};

/** Require an installed, enabled module of the given type(s). */
export function requireModule(...types: ModuleType[]) {
  return createMiddleware<{ Variables: HonoAuthenticatedVariables & ModuleGuardVariables }>(
    async (c: Context, next: Next) => {
      const row = await moduleRepository.findFirstByTypes(types);
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
