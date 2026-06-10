import { zValidator } from "@hono/zod-validator";

import { NotFoundError } from "@/errors/error";
import { requireRole } from "@/modules/auth/role.guard";
import { createUserSchema, updateUserSchema } from "./user.dto";
import { UserService } from "./user.service";

export const userRoutes = UserService.createRouter()
  .get("/:id", async (c) => {
    const result = await c.var.service.get(c.req.param("id"));
    if (!result) throw new NotFoundError("User");
    return c.json(result);
  })
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany());
  })
  .post("/", zValidator("json", createUserSchema), async (c) => {
    return c.json(await c.var.service.create(c.get("user"), c.req.valid("json")));
  })
  .put("/:id", zValidator("json", updateUserSchema), async (c) => {
    return c.json(await c.var.service.update(c.get("user"), c.req.param("id"), c.req.valid("json")));
  })
  .delete("/:id", async (c) => {
    return c.json(await c.var.service.delete(c.get("user"), c.req.param("id")));
  });
