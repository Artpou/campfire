import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { NotFoundError } from "@/shared/errors/error";
import { downloadMediaIdParamDto, stringIdParamDto } from "@/shared/helpers/param.dto";
import { downloadStartRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { requireRole } from "@/modules/auth/role.guard";
import { downloadTorrentDto } from "./download.dto";
import { requireDownloadOwnership } from "./download.guard";
import { DownloadService } from "./download.service";

function getDownloadId(c: { req: { valid: (target: "param") => { id: string } } }): string {
  return c.req.valid("param").id;
}

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
  .get("/:id/remote-files", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.listRemoteFiles(id));
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
  .post(
    "/:id/recheck",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.recheck(getDownloadId(c)));
    },
  )
  .post(
    "/:id/reannounce",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.reannounce(getDownloadId(c)));
    },
  )
  .patch(
    "/:id/media",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    zValidator("json", z.object({ mediaId: z.number().int().positive() })),
    requireDownloadOwnership,
    async (c) => {
      return c.json(await c.var.service.reassignMedia(getDownloadId(c), c.req.valid("json").mediaId));
    },
  )
  .delete(
    "/:id",
    requireRole("member"),
    zValidator("param", stringIdParamDto),
    zValidator(
      "query",
      z.object({
        dbOnly: z.enum(["true"]).optional(),
        scope: z.enum(["torrent", "remote", "all"]).optional(),
        unlink: z.enum(["true"]).optional(),
      }),
    ),
    requireDownloadOwnership,
    async (c) => {
      const query = c.req.valid("query");
      const dbOnly = query.dbOnly === "true";
      const scope = query.scope ?? "all";
      const unlink = query.unlink === "true";
      return c.json(await c.var.service.delete(getDownloadId(c), { dbOnly, scope, unlink }));
    },
  );
