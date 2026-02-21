import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { DownloadService } from "@/modules/download/download.service";
import type { HonoVariables } from "@/types/hono";
import * as path from "node:path";
import { downloadSubtitleSchema, searchSubtitlesSchema } from "./subtitle.dto";
import * as SubtitleService from "./subtitle.service";

export const subtitleRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .use("*", requireRole("member"))
  .get("/search", zValidator("query", searchSubtitlesSchema), async (c) => {
    const { tmdb_id, languages, type } = c.req.valid("query");
    const data = await SubtitleService.search(tmdb_id, languages, type);
    return c.json(data);
  })
  .post("/download", zValidator("json", downloadSubtitleSchema), async (c) => {
    const { downloadId, url, language, mediaTitle } = c.req.valid("json");
    const user = c.get("user");
    const download = await DownloadService.fromContext(c).getById(downloadId);
    if (!download) {
      return c.json({ error: "Download not found" }, 404);
    }
    if (download.userId !== user.id && !["owner", "admin"].includes(user.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
    const downloadFolderPath = path.join(downloadsPath, download.savePath || download.name);
    const { relativePath } = await SubtitleService.download(
      downloadFolderPath,
      url,
      language,
      mediaTitle,
    );
    return c.json({ relativePath });
  });

export type SubtitleRoutesType = typeof subtitleRoutes;
