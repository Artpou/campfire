import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { mediaRequest } from "@/modules/request/request.schema";
import type { HonoAuthenticatedVariables } from "../auth/auth.guard";

export async function requireRequestOwner(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const requestId = c.req.param("id");
  if (!requestId) throw new BadRequestError("Missing request id");

  const row = await db.query.mediaRequest.findFirst({
    where: eq(mediaRequest.id, requestId),
    columns: { id: true, userId: true },
  });
  if (!row) throw new NotFoundError("Request");

  if (ROLE_LEVELS[c.var.user.role] < ROLE_LEVELS.admin && c.var.user.id !== row.userId) {
    throw new ForbiddenError("You are not the owner of this request");
  }

  await next();
}
