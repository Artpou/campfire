import type { Elysia } from "elysia";

import type { UserRole } from "@/db/schema";
import { authGuard } from "@/modules/auth/auth.guard";
import { UnauthorizedError } from "./error";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

const roleHierarchy: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const requireRole = (minRole: UserRole) => (app: Elysia) =>
  app.use(authGuard()).resolve(({ user }) => {
    if (!user) throw new UnauthorizedError();
    if (roleHierarchy[user.role] < roleHierarchy[minRole]) {
      throw new ForbiddenError();
    }
    return {};
  });
