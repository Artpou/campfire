import { zValidator } from "@hono/zod-validator";

import { torrentRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { requireRole } from "@/modules/auth/role.guard";
import { torrentInspectDto, torrentListDto } from "@/modules/torrent/torrent.dto";
import { TorrentService } from "./torrent.service";

export const torrentRoutes = TorrentService.createRouter()
  .use("*", requireRole("member"))
  .post("/list", torrentRateLimiter, zValidator("json", torrentListDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("json")));
  })
  .get("/inspect", torrentRateLimiter, zValidator("query", torrentInspectDto), async (c) => {
    return c.json(await c.var.service.inspectTorrent(c.req.valid("query")));
  });
