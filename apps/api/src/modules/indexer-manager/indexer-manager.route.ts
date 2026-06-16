import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { requireRole } from "@/modules/auth/role.guard";
import { createIndexerManagerDto, updateIndexerManagerDto } from "./indexer-manager.dto";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = IndexerManagerService.createRouter()
  .use("*", requireRole("member"))
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany({ withIndexers: true }));
  })
  .get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");
    const config = await c.var.service.get(id);
    return c.json(config ?? null);
  })
  .use("*", requireRole("admin"))
  .post("/", zValidator("json", createIndexerManagerDto), async (c) => {
    return c.json(await c.var.service.create(c.req.valid("json")));
  })
  .patch(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", updateIndexerManagerDto),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await c.var.service.update(id, c.req.valid("json")));
    },
  )
  .delete("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.remove(id));
  });
