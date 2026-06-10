import { zValidator } from "@hono/zod-validator";

import { requireRole } from "@/modules/auth/role.guard";
import { upsertIndexerManagerDto } from "./indexer-manager.dto";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = IndexerManagerService.createRouter()
  .use("*", requireRole("member"))
  .get("/", async (c) => {
    return c.json((await c.var.service.get()) ?? null);
  })
  .post("/", zValidator("json", upsertIndexerManagerDto), async (c) => {
    const body = c.req.valid("json");
    return c.json(await c.var.service.upsert(body));
  })
  .delete("/", async (c) => {
    return c.json(await c.var.service.delete());
  });
