import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import type { HonoVariables } from "@/types/hono";
import { createIndexerManagerSchema } from "./indexer-manager.dto";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .use("*", requireRole("member"))
  .get("/", async (c) => {
    return c.json(await IndexerManagerService.fromContext(c).list());
  })
  .post("/", zValidator("json", createIndexerManagerSchema), async (c) => {
    const body = c.req.valid("json");
    return c.json(await IndexerManagerService.fromContext(c).upsert(body));
  });

export type IndexerManagerRoutesType = typeof indexerManagerRoutes;
