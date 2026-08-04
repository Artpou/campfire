import { zValidator } from "@hono/zod-validator";

import { stringIdParamDto } from "@/shared/helpers/param.dto";

import { requireRole } from "@/modules/auth/role.guard";
import { createIndexerManagerDto, updateIndexerManagerDto } from "./indexer-manager.dto";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = IndexerManagerService.createRouter()
  .use("*", requireRole("member"))
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany({ withIndexers: true }));
  })
  .get("/count", async (c) => {
    return c.json(await c.var.service.count());
  })
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.get(id));
  })
  .use("*", requireRole("admin"))
  .post("/", zValidator("json", createIndexerManagerDto), async (c) => {
    return c.json(await c.var.service.create(c.req.valid("json")));
  })
  .patch("/:id", zValidator("param", stringIdParamDto), zValidator("json", updateIndexerManagerDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.update(id, c.req.valid("json")));
  })
  .delete("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.remove(id));
  });
