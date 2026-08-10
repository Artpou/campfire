import { zValidator } from "@hono/zod-validator";
import {
  changePasswordDto,
  createUserDto,
  stringIdParamDto,
  updateProfileDto,
  updateUserDto,
} from "@seedarr/contracts";

import { BadRequestError } from "@/shared/errors/error";

import { requireRole } from "@/modules/auth/role.guard";
import { UserService } from "./user.service";

export const userRoutes = UserService.createRouter()
  .patch("/me", zValidator("json", updateProfileDto), async (c) => {
    return c.json(await c.var.service.updateProfile(c.req.valid("json")));
  })
  .post("/me/password", zValidator("json", changePasswordDto), async (c) => {
    return c.json(await c.var.service.changePassword(c.req.valid("json")));
  })
  .post("/me/avatar", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new BadRequestError("Missing image file");
    return c.json(await c.var.service.uploadAvatar(file));
  })
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
