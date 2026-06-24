import type { Context, MiddlewareHandler, Next } from "hono";

import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import type { UserRole } from "@/modules/user/user.schema";
import { ForbiddenError, UnauthorizedError } from "../../errors/error";

export const ROLE_LEVELS = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
} as const;

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
