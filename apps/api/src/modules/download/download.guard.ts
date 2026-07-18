import { and, eq } from "drizzle-orm";
import type { Context, Next } from "hono";

import { db } from "@/db/db";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/errors/error";
import { download } from "@/modules/download/download.schema";
import type { HonoAuthenticatedVariables } from "../auth/auth.guard";

/** Ownership check without remote FTP enrichment (keeps stream/pause/transfer fast). */
export async function requireDownloadOwnership(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  if (!downloadId) throw new BadRequestError("Missing download id");
  const user = c.get("user");

  const row = await db.query.download.findFirst({
    where: and(eq(download.id, downloadId)),
    columns: { id: true, userId: true },
  });
  if (!row) throw new NotFoundError("Download");

  if (row.userId !== user.id && !["owner", "admin"].includes(user.role)) {
    throw new ForbiddenError();
  }

  await next();
}
