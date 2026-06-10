import type { Context, Next } from "hono";

import { ForbiddenError, NotFoundError } from "@/errors/error";
import { HonoAuthenticatedVariables } from "../auth/auth.guard";
import { DownloadService } from "./download.service";

export async function requireDownloadOwnership(
  c: Context<{ Variables: HonoAuthenticatedVariables }>,
  next: Next,
): Promise<void> {
  const downloadId = c.req.param("id");
  const user = c.get("user");

  const download = await new DownloadService(user).get(downloadId);
  if (!download) throw new NotFoundError("Download");

  if (download.userId !== user.id && !["owner", "admin"].includes(user.role)) {
    throw new ForbiddenError();
  }

  await next();
}
