import { zValidator } from "@hono/zod-validator";

import { ForbiddenError } from "@/errors/error";
import { resolveWithinDownloads } from "@/helpers/path.helper";
import { subtitleRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { DownloadService } from "@/modules/download/download.service";
import { SubtitleService } from "@/modules/subtitle/subtitle.service";
import { downloadSubtitleDto, subtitlesSearchDto } from "./subtitle.dto";

export const subtitleRoutes = SubtitleService.createRouter()
  .use(subtitleRateLimiter)
  .get("/search", zValidator("query", subtitlesSearchDto), async (c) => {
    return c.json(await c.var.service.search(c.req.valid("query")));
  })
  .post("/download", zValidator("json", downloadSubtitleDto), async (c) => {
    const { downloadId, url, language, mediaTitle } = c.req.valid("json");
    const user = c.get("user");

    const download = await new DownloadService(user).get(downloadId);
    if (download.userId !== user.id && !["owner", "admin"].includes(user.role)) {
      throw new ForbiddenError();
    }

    const downloadFolderPath = resolveWithinDownloads(download.torrent?.name ?? "");
    const { relativePath } = await c.var.service.download(downloadFolderPath, url, language, mediaTitle);
    return c.json({ relativePath });
  });
