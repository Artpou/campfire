import { zValidator } from "@hono/zod-validator";

import { torrentInspectDto, torrentListDto } from "@/modules/torrent/torrent.dto";
import { TorrentService } from "./torrent.service";

export const torrentRoutes = TorrentService.createRouter()
  .post("/list", zValidator("json", torrentListDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("json")));
  })
  .get("/inspect", zValidator("query", torrentInspectDto), async (c) => {
    return c.json(await c.var.service.inspectTorrent(c.req.valid("query")));
  });
