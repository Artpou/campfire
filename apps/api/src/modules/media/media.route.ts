import { zValidator } from "@hono/zod-validator";
import { listMediaDto, mediaIdParamDto, mediaInputSchema, updateProgressDto } from "@seedarr/contracts";

import { requireRole } from "@/modules/auth/role.guard";
import { MediaService } from "./media.service";

export const mediaRoutes = MediaService.createRouter()
  .get("/", zValidator("query", listMediaDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  })
  .get("/:id", zValidator("param", mediaIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.get(id));
  })
  .post("/", requireRole("member"), zValidator("json", mediaInputSchema), async (c) => {
    return c.json(await c.var.service.upsert(c.req.valid("json")));
  })
  .post("/:id/like", zValidator("param", mediaIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.toggleLike(Number(id)));
  })
  .post("/:id/watchlist", zValidator("param", mediaIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.toggleWatchList(Number(id)));
  })
  .patch("/:id/progress", zValidator("param", mediaIdParamDto), zValidator("json", updateProgressDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.updateProgress(Number(id), c.req.valid("json")));
  });
