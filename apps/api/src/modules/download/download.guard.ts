import { ROLE_LEVELS } from "@seedarr/contracts";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { download } from "@/modules/download/download.schema";
import type { HonoAuthenticatedVariables } from "../auth/auth.guard";

export async function requireDownloadExists(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  if (!downloadId) throw new BadRequestError("Missing download id");

  const row = await db.query.download.findFirst({
    where: eq(download.id, downloadId),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Download");

  await next();
}

export async function requireDownloadOwner(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  if (!downloadId) throw new BadRequestError("Missing download id");

  const row = await db.query.download.findFirst({
    where: eq(download.id, downloadId),
    columns: { id: true, userId: true },
  });
  if (!row) throw new NotFoundError("Download");

  if (ROLE_LEVELS[c.var.user.role] < ROLE_LEVELS.admin && c.var.user.id !== row.userId) {
    throw new ForbiddenError("You are not the owner of this download");
  }

  await next();
}

/** Assert a download id exists (for body params such as watch progress). */
export async function assertDownloadExists(downloadId: string): Promise<void> {
  const row = await db.query.download.findFirst({
    where: eq(download.id, downloadId),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Download");
}
