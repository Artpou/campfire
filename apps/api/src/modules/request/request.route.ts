import { zValidator } from "@hono/zod-validator";
import { listRequestsDto, mediaInputSchema, stringIdParamDto } from "@seedarr/contracts";

import { requireRole } from "@/modules/auth/role.guard";
import { RequestService } from "./request.service";

export const requestRoutes = RequestService.createRouter()
  .post("/", zValidator("json", mediaInputSchema), async (c) => {
    return c.json(await c.var.service.create(c.req.valid("json")), 201);
  })
  .get("/", requireRole("admin"), zValidator("query", listRequestsDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  })
  .get("/mine", async (c) => {
    return c.json(await c.var.service.listByUser(c.get("user").id));
  })
  .patch("/:id/dismiss", requireRole("admin"), zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.dismiss(id);
    return c.json({ success: true });
  })
  .delete("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.remove(id);
    return c.json({ success: true });
  });
