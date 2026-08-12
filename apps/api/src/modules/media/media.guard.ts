import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import type { HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { media } from "@/modules/media/media.schema";

/** Verifies the `:id` path param is a valid media id that exists in the DB. */
export async function requireMediaExists(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const id = c.req.param("id");
  if (!id || Number.isNaN(Number(id))) throw new BadRequestError("Missing media id");

  const row = await db.query.media.findFirst({
    where: eq(media.id, Number(id)),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Media");

  await next();
}

/** Parse YYYY-MM-DD into a local noon Date for review watchedAt. */
export function parseWatchedAt(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Assert media id is present on input payloads. */
export function assertMediaId(id: number | undefined | null): asserts id is number {
  if (id == null) throw new BadRequestError("Media ID is required");
}
