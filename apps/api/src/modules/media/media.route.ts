import { zValidator } from "@hono/zod-validator";
import {
  listMediaDto,
  mediaIdParamDto,
  mediaInputSchema,
  updateProgressDto,
  upsertReviewDto,
} from "@seedarr/contracts";

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
  .post("/:id/like", zValidator("json", mediaInputSchema), async (c) => {
    return c.json(await c.var.service.toggleLike(c.req.valid("json")));
  })
  .post("/:id/watchlist", zValidator("json", mediaInputSchema), async (c) => {
    return c.json(await c.var.service.toggleWatchList(c.req.valid("json")));
  })
  .put("/:id/review", zValidator("param", mediaIdParamDto), zValidator("json", upsertReviewDto), async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(
      await c.var.service.upsertReview(
        Number(id),
        { score: body.score, comment: body.comment, watchedAt: body.watchedAt },
        body.media,
      ),
    );
  })
  .delete("/:id/review", zValidator("param", mediaIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.deleteReview(Number(id)));
  })
  .patch("/:id/progress", zValidator("param", mediaIdParamDto), zValidator("json", updateProgressDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.updateProgress(Number(id), c.req.valid("json")));
  });
