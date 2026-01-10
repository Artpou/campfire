import type { Context, Next } from "hono";

import type { HonoVariables } from "@/types/hono";
import { DownloadService } from "./download.service";

/**
 * Middleware to check if the user has permission to access a download
 * Only the download owner or admin/owner roles can access
 */
export async function requireDownloadOwnership(
  c: Context<{ Variables: HonoVariables }>,
  next: Next,
): Promise<Response | undefined> {
  const downloadId = c.req.param("id");
  const user = c.get("user");

  // Get the download
  const download = await DownloadService.fromContext(c).getById(downloadId);

  if (!download) {
    return c.json({ error: "Download not found" }, 404);
  }

  // Check if user is owner or has admin/owner role
  if (download.userId !== user.id && !["owner", "admin"].includes(user.role)) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  // Store download in context for reuse in route handler
  c.set("download", download);

  await next();
}
