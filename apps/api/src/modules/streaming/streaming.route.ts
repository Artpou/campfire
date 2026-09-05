import { zValidator } from "@hono/zod-validator";
import { downloadFilePathParamDto, stringIdParamDto } from "@seedarr/contracts";
import { stream } from "hono/streaming";

import { streamingRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { StreamingService } from "./streaming.service";

/** Any authenticated user (session cookie) can stream any playable download. */
export const streamingRoutes = StreamingService.createRouter()
  .use("*", streamingRateLimiter)
  .get("/:id/info", zValidator("param", stringIdParamDto), async (c) => {
    const download = await c.var.service.getDownload(c.req.valid("param").id);
    return c.json(await c.var.service.getPlaybackInfo(download));
  })
  .get("/:id/direct", zValidator("param", stringIdParamDto), async (c) => {
    const download = await c.var.service.getDownload(c.req.valid("param").id);
    const { status, headers, pipe } = await c.var.service.prepareDirectStream(download, c.req.header("range"));

    c.status(status);
    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    if (!pipe) return c.body(null);
    return stream(c, pipe);
  })
  .get("/:id/live", zValidator("param", stringIdParamDto), async (c) => {
    const download = await c.var.service.getDownload(c.req.valid("param").id);
    const { headers, pipe } = await c.var.service.prepareLiveStream(download);

    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    return stream(c, pipe);
  })
  .get("/:id/subtitles", zValidator("param", stringIdParamDto), async (c) => {
    const download = await c.var.service.getDownload(c.req.valid("param").id);
    return c.json(await c.var.service.listExternalSubtitles(download));
  })
  .get("/:id/subtitles/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath } = c.req.valid("param");
    const download = await c.var.service.getDownload(id);
    const { content, contentType } = await c.var.service.getSubtitleFile(download, filePath);

    c.header("Content-Type", contentType);
    c.header("Access-Control-Allow-Origin", process.env.WEB_URL || "");
    c.header("Access-Control-Allow-Methods", "GET");
    c.header("Cache-Control", "private, no-cache");

    return c.body(content);
  });
