import type { Context, MiddlewareHandler, Next } from "hono";

import type { UserRole } from "@/modules/user/user.schema";
import { ForbiddenError, UnauthorizedError } from "../../errors/error";

const roleHierarchy: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const requireRole = (minRole: UserRole): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw new UnauthorizedError();
    }

    if (roleHierarchy[user.role as UserRole] < roleHierarchy[minRole]) {
      throw new ForbiddenError();
    }

    await next();
  };
};
