import { zValidator } from "@hono/zod-validator";

import { listMediaDto, mediaInsertSchema, updateProgressDto } from "./media.dto";
import { MediaService } from "./media.service";

export const mediaRoutes = MediaService.createRouter()
  .get("/", zValidator("query", listMediaDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  })
  .get("/:id", async (c) => {
    return c.json(await c.var.service.get(c.req.param("id")));
  })
  .post("/", zValidator("json", mediaInsertSchema), async (c) => {
    return c.json(await c.var.service.upsert(c.req.valid("json")));
  })
  .post("/:id/like", async (c) => {
    return c.json(await c.var.service.toggleLike(Number(c.req.param("id"))));
  })
  .post("/:id/watchlist", async (c) => {
    return c.json(await c.var.service.toggleWatchList(Number(c.req.param("id"))));
  })
  .patch("/:id/progress", zValidator("json", updateProgressDto), async (c) => {
    return c.json(await c.var.service.updateProgress(Number(c.req.param("id")), c.req.valid("json")));
  })
  .delete("/history", async (c) => {
    return c.json(await c.var.service.clearHistory());
  });
