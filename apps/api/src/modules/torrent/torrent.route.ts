import { zValidator } from "@hono/zod-validator";

import { torrentInspectDto, torrentSearchDto } from "@/modules/torrent/torrent.dto";
import { TorrentService } from "./torrent.service";

export const torrentRoutes = TorrentService.createRouter()
  .get("/indexers", async (c) => c.json(await c.var.service.getIndexers()))
  .post("/search", zValidator("json", torrentSearchDto), async (c) => {
    return c.json(await c.var.service.searchTorrents(c.req.valid("json")));
  })
  .get("/inspect", zValidator("query", torrentInspectDto), async (c) => {
    return c.json(await c.var.service.inspectTorrent(c.req.valid("query")));
  });
