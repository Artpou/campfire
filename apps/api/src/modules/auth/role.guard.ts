import { ROLE_LEVELS } from "@seedarr/shared";
import type { Context, MiddlewareHandler, Next } from "hono";

import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import type { UserRole } from "@/modules/user/user.schema";
import { ForbiddenError, UnauthorizedError } from "../../shared/errors/error";

export { ROLE_LEVELS };

export const requireRole = (minRole: UserRole): MiddlewareHandler => {
  return async (c: Context<{ Variables: HonoAuthenticatedVariables }>, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError();
    }

    if (ROLE_LEVELS[user.role] < ROLE_LEVELS[minRole]) {
      throw new ForbiddenError();
    }

    await next();
  };
};
