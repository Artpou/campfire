import { zValidator } from "@hono/zod-validator";
import { stream } from "hono/streaming";

import { NotFoundError } from "@/errors/error";
import { downloadFilePathParamDto, downloadMediaIdParamDto, stringIdParamDto } from "@/helpers/param.dto";
import { toWebStream } from "@/helpers/stream.helper";
import { downloadStartRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { requireRole } from "@/modules/auth/role.guard";
import { downloadTorrentDto } from "./download.dto";
import { requireDownloadOwnership } from "./download.guard";
import { DownloadService } from "./download.service";
import { DownloadStreamService } from "./download-stream.service";

function getDownloadId(c: { req: { valid: (target: "param") => { id: string } } }): string {
  return c.req.valid("param").id;
}

const streamService = new DownloadStreamService();

export const downloadRoutes = DownloadService.createRouter()
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany());
  })
  .get("/stats", async (c) => {
    return c.json(await c.var.service.getStats());
  })
  .get("/by-media/:mediaId", zValidator("param", downloadMediaIdParamDto), async (c) => {
    const { mediaId } = c.req.valid("param");
    return c.json(await c.var.service.getByMediaId(Number(mediaId)));
  })
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");
    return c.json(download);
  })
  .post("/", requireRole("member"), downloadStartRateLimiter, zValidator("json", downloadTorrentDto), async (c) => {
    const result = await c.var.service.start(c.req.valid("json"));
    if ("status" in result && result.status === "REMOTE_UNAVAILABLE") {
      return c.json({ status: "REMOTE_UNAVAILABLE", error: "Remote storage server is unavailable" }, 409);
    }
    return c.json(result);
  })
  .get("/:id/stream", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const [download] = await c.var.service.findMany({ ids: [getDownloadId(c)] });
    if (!download) throw new NotFoundError("Download");
    const plan = await streamService.buildPlaybackPlan(download, c.req.header("range"));

    if (plan.type === "rangeNotSatisfiable") {
      c.status(416);
      c.header("Content-Range", `bytes */${plan.size}`);
      return c.body(null);
    }

    c.status(plan.status);
    for (const [key, value] of Object.entries(plan.headers)) {
      c.header(key, value);
    }

    return stream(c, (honoStream) => streamService.pipePlayback(plan, honoStream));
  })
  .get("/:id/file/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath } = c.req.valid("param");
    const [download] = await c.var.service.findMany({ ids: [id] });
    if (!download) throw new NotFoundError("Download");
    const file = streamService.getFile(download, filePath);

    c.header("Content-Type", file.contentType);
    c.header("Content-Length", file.size.toString());
    return c.body(toWebStream(file.stream));
  })
  .get("/:id/external-subtitles", zValidator("param", stringIdParamDto), async (c) => {
    const [download] = await c.var.service.findMany({ ids: [c.req.valid("param").id] });
    if (!download) throw new NotFoundError("Download");
    return c.json(await streamService.listExternalSubtitles(download));
  })
  .get("/:id/subtitles/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath } = c.req.valid("param");
    const [download] = await c.var.service.findMany({ ids: [id] });
    if (!download) throw new NotFoundError("Download");
    const vtt = await streamService.getSubtitleVtt(download, filePath);

    c.header("Content-Type", "text/vtt; charset=utf-8");
    c.header("Access-Control-Allow-Origin", process.env.WEB_URL || "");
    c.header("Access-Control-Allow-Methods", "GET");
    c.header("Cache-Control", "public, max-age=3600");

    return c.text(vtt);
  })
  .post(
    "/:id/pause",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.pause(getDownloadId(c)));
    },
  )
  .post(
    "/:id/resume",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.resume(getDownloadId(c)));
    },
  )
  .post(
    "/:id/transfer",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.transfer(getDownloadId(c)));
    },
  )
  .delete("/:id", requireRole("member"), zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.delete(getDownloadId(c)));
  });
