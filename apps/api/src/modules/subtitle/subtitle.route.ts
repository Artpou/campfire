import { zValidator } from "@hono/zod-validator";
import { downloadSubtitleDto, subtitlesSearchDto } from "@seedarr/contracts";

import { subtitleRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { requireModule } from "@/modules/module/module.guard";
import { SubtitleService } from "@/modules/subtitle/subtitle.service";

export const subtitleRoutes = SubtitleService.createRouter()
  .use(requireModule("subdl"))
  .use(subtitleRateLimiter)
  .get("/search", zValidator("query", subtitlesSearchDto), async (c) => {
    return c.json(await c.var.service.search(c.req.valid("query")));
  })
  .post("/download", zValidator("json", downloadSubtitleDto), async (c) => {
    const { downloadId, url, language, mediaTitle } = c.req.valid("json");
    return c.json(await c.var.service.downloadForDownload(downloadId, url, language, mediaTitle));
  });
