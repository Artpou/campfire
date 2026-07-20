import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { stream } from "hono/streaming";

import { db } from "@/db/db";
import { NotFoundError } from "@/errors/error";
import { downloadFilePathParamDto, stringIdParamDto } from "@/helpers/param.dto";
import { authGuard } from "@/modules/auth/auth.guard";
import { download as downloadTable } from "@/modules/download/download.schema";
import type { HonoVariables } from "@/types/hono";
import { StreamingService } from "./streaming.service";
import { StreamingSubtitleService } from "./streaming-subtitle.service";

const streamingService = new StreamingService();
const subtitleService = new StreamingSubtitleService();

async function getDownload(id: string) {
  const row = await db.query.download.findFirst({ where: eq(downloadTable.id, id) });
  if (!row) throw new NotFoundError("Download");
  return row;
}

/** Any authenticated user (session cookie) can stream any playable download. */
export const streamingRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .get("/:id/info", zValidator("param", stringIdParamDto), async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    return c.json(await streamingService.getPlaybackInfo(download));
  })
  .get("/:id/direct", zValidator("param", stringIdParamDto), async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    const { status, headers, pipe } = await streamingService.prepareDirectStream(download, c.req.header("range"));

    c.status(status);
    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    if (!pipe) return c.body(null);
    return stream(c, pipe);
  })
  .get("/:id/live", zValidator("param", stringIdParamDto), async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    const { headers, pipe } = await streamingService.prepareLiveStream(download);

    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    return stream(c, pipe);
  })
  .get("/:id/subtitles", zValidator("param", stringIdParamDto), async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    return c.json(await subtitleService.listExternalSubtitles(download));
  })
  .get("/:id/subtitles/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath } = c.req.valid("param");
    const download = await getDownload(id);
    const { content, contentType } = await subtitleService.getSubtitleFile(download, filePath);

    c.header("Content-Type", contentType);
    c.header("Access-Control-Allow-Origin", process.env.WEB_URL || "");
    c.header("Access-Control-Allow-Methods", "GET");
    c.header("Cache-Control", "public, max-age=3600");

    return c.text(content);
  });
