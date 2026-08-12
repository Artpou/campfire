import { zValidator } from "@hono/zod-validator";
import { listRequestsDto, mediaInputSchema, stringIdParamDto } from "@seedarr/contracts";

import { ForbiddenError } from "@/shared/errors/error";

import { ROLE_LEVELS, requireRole } from "@/modules/auth/role.guard";
import { requireRequestOwner } from "@/modules/request/request.guard";
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
  .get("/user/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id: userId } = c.req.valid("param");
    const currentUser = c.get("user");
    const isOwn = currentUser.id === userId;
    const isAdmin = ROLE_LEVELS[currentUser.role as keyof typeof ROLE_LEVELS] >= ROLE_LEVELS.admin;
    if (!isOwn && !isAdmin) throw new ForbiddenError();
    return c.json(await c.var.service.listByUser(userId));
  })
  .patch("/:id/cancel", requireRole("admin"), zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.cancel(id);
    return c.json({ success: true });
  })
  .patch("/:id/validate", requireRole("admin"), zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.validate(id);
    return c.json({ success: true });
  })
  .patch("/:id/reopen", zValidator("param", stringIdParamDto), requireRequestOwner, async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.reopen(id);
    return c.json({ success: true });
  })
  .delete("/:id", zValidator("param", stringIdParamDto), requireRequestOwner, async (c) => {
    const { id } = c.req.valid("param");
    await c.var.service.remove(id);
    return c.json({ success: true });
  });
