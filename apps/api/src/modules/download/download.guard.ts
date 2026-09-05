import { ROLE_LEVELS } from "@seedarr/shared";
import type { Context, Next } from "hono";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";

import { downloadRepository } from "@/modules/download/download.repository";
import type { HonoAuthenticatedVariables } from "../auth/auth.guard";

export async function requireDownloadExists(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  if (!downloadId) throw new BadRequestError("Missing download id");

  if (!(await downloadRepository.exists(downloadId))) throw new NotFoundError("Download");

  await next();
}

export async function requireDownloadOwner(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  if (!downloadId) throw new BadRequestError("Missing download id");

  const row = await downloadRepository.find(downloadId);
  if (!row) throw new NotFoundError("Download");

  if (ROLE_LEVELS[c.var.user.role] < ROLE_LEVELS.admin && c.var.user.id !== row.userId) {
    throw new ForbiddenError("You are not the owner of this download");
  }

  await next();
}
