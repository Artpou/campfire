import type { Context, Next } from "hono";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";

import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { mediaRepository } from "@/modules/media/media.repository";

/** Verifies the `:id` path param is a valid media id that exists in the DB. */
export async function requireMediaExists(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const id = c.req.param("id");
  if (!id || Number.isNaN(Number(id))) throw new BadRequestError("Missing media id");

  if (!(await mediaRepository.exists(Number(id)))) throw new NotFoundError("Media");

  await next();
}
