import { zValidator } from "@hono/zod-validator";
import {
  batchDeleteDownloadsDto,
  deleteDownloadQueryDto,
  downloadMediaIdParamDto,
  downloadTorrentDto,
  paginationDto,
  reassignMediaDto,
  stringIdParamDto,
} from "@seedarr/contracts";

import { NotFoundError } from "@/shared/errors/error";
import { downloadStartRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { trackRoute } from "@/modules/activity/activity.service";
import { requireRole } from "@/modules/auth/role.guard";
import { requireDownloadExists, requireDownloadOwner } from "./download.guard";
import { DownloadService } from "./download.service";

function getDownloadId(c: { req: { valid: (target: "param") => { id: string } } }): string {
  return c.req.valid("param").id;
}

export const downloadRoutes = DownloadService.createRouter()
  .get("/", zValidator("query", paginationDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  })
  .get("/stats", async (c) => {
    return c.json(await c.var.service.getStats());
  })
  .get("/by-media/:mediaId", zValidator("param", downloadMediaIdParamDto), async (c) => {
    const { mediaId } = c.req.valid("param");
    return c.json(await c.var.service.getByMediaId(Number(mediaId)));
  })
  .get("/:id/remote-files", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.listRemoteFiles(id));
  })
  .get("/:id/video-file", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.getDownloadableFile(id));
  })
  .post("/:id/fileToken", zValidator("param", stringIdParamDto), requireDownloadExists, async (c) => {
    return c.json(c.var.service.createFileToken(getDownloadId(c)));
  })
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");
    return c.json(download);
  })
  .post("/", requireRole("member"), downloadStartRateLimiter, zValidator("json", downloadTorrentDto), async (c) => {
    const body = c.req.valid("json");
    const result = await trackRoute(
      c,
      {
        action: "DOWNLOAD_START",
        mediaId: body.media.id,
        moduleId: body.moduleIndexerId,
        metadata: { name: body.name, quality: body.quality, language: body.language, origin: body.origin },
      },
      () => c.var.service.start(body),
    );
    if ("status" in result && result.status === "REMOTE_UNAVAILABLE") {
      return c.json({ status: "REMOTE_UNAVAILABLE", error: "Remote storage server is unavailable" }, 409);
    }
    return c.json(result);
  })
  .post("/:id/pause", requireRole("member"), zValidator("param", stringIdParamDto), requireDownloadOwner, async (c) => {
    return c.json(await c.var.service.pause(getDownloadId(c)));
  })
  .post(
    "/:id/resume",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwner,
    async (c) => {
      return c.json(await c.var.service.resume(getDownloadId(c)));
    },
  )
  .post(
    "/:id/transfer",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwner,
    async (c) => {
      return c.json(await c.var.service.transfer(getDownloadId(c)));
    },
  )
  .post(
    "/:id/recheck",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwner,
    async (c) => {
      return c.json(await c.var.service.recheck(getDownloadId(c)));
    },
  )
  .post(
    "/:id/reannounce",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwner,
    async (c) => {
      return c.json(await c.var.service.reannounce(getDownloadId(c)));
    },
  )
  .patch(
    "/:id/media",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    zValidator("json", reassignMediaDto),
    requireDownloadOwner,
    async (c) => {
      return c.json(await c.var.service.reassignMedia(getDownloadId(c), c.req.valid("json").mediaId));
    },
  )
  .post("/batch-delete", requireRole("admin"), zValidator("json", batchDeleteDownloadsDto), async (c) => {
    const { ids, dbOnly } = c.req.valid("json");
    return c.json(
      await trackRoute(
        c,
        {
          action: "DOWNLOAD_DELETE",
          metadata: { ids, dbOnly: Boolean(dbOnly) },
        },
        () => c.var.service.batchDelete(ids, { dbOnly }),
      ),
    );
  })
  .delete(
    "/:id",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    zValidator("query", deleteDownloadQueryDto),
    requireDownloadOwner,
    async (c) => {
      const query = c.req.valid("query");
      const dbOnly = query.dbOnly === "true";
      const scope = query.scope ?? "all";
      const unlink = query.unlink === "true";
      const id = getDownloadId(c);
      const item = await c.var.service.get(id);
      return c.json(
        await trackRoute(
          c,
          {
            action: "DOWNLOAD_DELETE",
            mediaId: item.mediaId,
            metadata: { downloadId: id, dbOnly, scope, unlink, name: item.torrent?.name },
          },
          () => c.var.service.delete(id, { dbOnly, scope, unlink }),
        ),
      );
    },
  );
