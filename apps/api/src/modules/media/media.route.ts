import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authGuard } from "@/modules/auth/auth.guard";
import { paginationParams } from "@/modules/pagination/pagination.helper";
import { idsSchema } from "@/modules/shared/shared.dto";
import type { HonoVariables } from "@/types/hono";
import {
  listMediaSchema,
  mediaInsertSchema,
  mediaSelectSchema,
  mediaUpdateSchema,
} from "./media.dto";
import { MediaService } from "./media.service";

export const mediaRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .get("/", zValidator("query", listMediaSchema), async (c) => {
    return c.json(
      await MediaService.fromContext(c).list(c.req.valid("query"), paginationParams(c)),
    );
  })
  .get("/:id", async (c) => {
    return c.json(await MediaService.fromContext(c).get(Number(c.req.param("id"))));
  })
  .post("/", zValidator("json", mediaInsertSchema), async (c) => {
    return c.json(await MediaService.fromContext(c).upsert(c.req.valid("json")));
  })
  .patch("/:id", zValidator("json", mediaUpdateSchema), async (c) => {
    return c.json(
      await MediaService.fromContext(c).update(Number(c.req.param("id")), c.req.valid("json")),
    );
  })
  .post("/like", zValidator("json", mediaSelectSchema), async (c) => {
    return c.json(await MediaService.fromContext(c).toggleLike(c.req.valid("json")));
  })
  .post("/watch-list", zValidator("json", mediaSelectSchema), async (c) => {
    return c.json(await MediaService.fromContext(c).toggleWatchList(c.req.valid("json")));
  })
  .post("/status", zValidator("json", idsSchema), async (c) => {
    return c.json(await MediaService.fromContext(c).listStatus(c.req.valid("json")));
  });

export type MediaRoutesType = typeof mediaRoutes;
