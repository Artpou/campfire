import type { Context, Next } from "hono";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";

import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { requestRepository } from "@/modules/request/request.repository";
import type { HonoAuthenticatedVariables } from "../auth/auth.guard";

export async function requireRequestOwner(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const requestId = c.req.param("id");
  if (!requestId) throw new BadRequestError("Missing request id");

  const row = await requestRepository.find(requestId);
  if (!row) throw new NotFoundError("Request");

  if (ROLE_LEVELS[c.var.user.role] < ROLE_LEVELS.admin && c.var.user.id !== row.userId) {
    throw new ForbiddenError("You are not the owner of this request");
  }

  await next();
}
