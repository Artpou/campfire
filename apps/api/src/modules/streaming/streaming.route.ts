import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";

import { db } from "@/db/db";
import { NotFoundError } from "@/errors/error";
import { downloadFilePathParamDto, stringIdParamDto } from "@/helpers/param.dto";
import { toWebStream } from "@/helpers/stream.helper";
import { authGuard } from "@/modules/auth/auth.guard";
import { requireDownloadOwnership } from "@/modules/download/download.guard";
import { download as downloadTable } from "@/modules/download/download.schema";
import type { HonoVariables } from "@/types/hono";
import { StreamingService } from "./streaming.service";
import { StreamingSubtitleService } from "./streaming-subtitle.service";

const streamingService = new StreamingService();
const subtitleService = new StreamingSubtitleService();

const segmentParamDto = z.object({
  id: z.string(),
  index: z.string().regex(/^\d+$/),
});

async function getDownload(id: string) {
  const row = await db.query.download.findFirst({ where: eq(downloadTable.id, id) });
  if (!row) throw new NotFoundError("Download");
  return row;
}

export const streamingRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .get("/:id/info", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    return c.json(await streamingService.getPlaybackInfo(download));
  })
  .get("/:id/hls/playlist.m3u8", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await getDownload(c.req.valid("param").id);

    const playlist = await streamingService.getHlsPlaylist(download);
    c.header("Content-Type", "application/vnd.apple.mpegurl");
    c.header("Cache-Control", "no-cache");
    return c.text(playlist);
  })
  .get("/:id/hls/:index.ts", zValidator("param", segmentParamDto), requireDownloadOwnership, async (c) => {
    const { id, index } = c.req.valid("param");
    const download = await getDownload(id);

    const segment = await streamingService.getHlsSegment(download, Number.parseInt(index, 10));
    c.header("Content-Type", "video/mp2t");
    c.header("Cache-Control", "public, max-age=3600");
    c.header("Content-Length", String(segment.byteLength));
    return c.body(new Uint8Array(segment));
  })
  .get("/:id/direct", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    const { status, headers, pipe } = await streamingService.prepareDirectStream(download, c.req.header("range"));

    c.status(status);
    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    if (!pipe) return c.body(null);
    return stream(c, pipe);
  })
  .get("/:id/live", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    const { headers, pipe } = await streamingService.prepareLiveStream(download);

    for (const [key, value] of Object.entries(headers)) c.header(key, value);
    return stream(c, pipe);
  })
  .get("/:id/file/:filePath", zValidator("param", downloadFilePathParamDto), requireDownloadOwnership, async (c) => {
    const { id, filePath } = c.req.valid("param");
    const download = await getDownload(id);
    const file = streamingService.getFile(download, filePath);

    c.header("Content-Type", file.contentType);
    c.header("Content-Length", file.size.toString());
    return c.body(toWebStream(file.stream));
  })
  .get("/:id/subtitles", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await getDownload(c.req.valid("param").id);
    return c.json(await subtitleService.listExternalSubtitles(download));
  })
  .get(
    "/:id/subtitles/:filePath",
    zValidator("param", downloadFilePathParamDto),
    requireDownloadOwnership,
    async (c) => {
      const { id, filePath } = c.req.valid("param");
      const download = await getDownload(id);
      const vtt = await subtitleService.getSubtitleVtt(download, filePath);

      c.header("Content-Type", "text/vtt; charset=utf-8");
      c.header("Access-Control-Allow-Origin", process.env.WEB_URL || "");
      c.header("Access-Control-Allow-Methods", "GET");
      c.header("Cache-Control", "public, max-age=3600");

      return c.text(vtt);
    },
  );
