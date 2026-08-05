import { zValidator } from "@hono/zod-validator";
import { createUserDto, stringIdParamDto, updateUserDto } from "@seedarr/contracts";

import { requireRole } from "@/modules/auth/role.guard";
import { UserService } from "./user.service";

export const userRoutes = UserService.createRouter()
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.get(id));
  })
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany());
  })
  .post("/", zValidator("json", createUserDto), async (c) => {
    return c.json(await c.var.service.create(c.get("user"), c.req.valid("json")));
  })
  .put("/:id", zValidator("param", stringIdParamDto), zValidator("json", updateUserDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.update(c.get("user"), id, c.req.valid("json")));
  })
  .delete("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.delete(c.get("user"), id));
  });
