import { zValidator } from "@hono/zod-validator";
import {
  changePasswordDto,
  createUserDto,
  listUsersDto,
  stringIdParamDto,
  updateProfileDto,
  updateUserDto,
} from "@seedarr/contracts";

import { BadRequestError } from "@/shared/errors/error";

import { trackRoute } from "@/modules/activity/activity.service";
import { requireRole } from "@/modules/auth/role.guard";
import { requireModule } from "@/modules/module/module.guard";
import { UserService } from "./user.service";

export const userRoutes = UserService.createRouter()
  .patch("/me", zValidator("json", updateProfileDto), async (c) => {
    const body = c.req.valid("json");
    return c.json(await trackRoute(c, { action: "USER_MODIFY" }, () => c.var.service.updateProfile(body)));
  })
  .post("/me/onboarded", async (c) => {
    return c.json(await c.var.service.completeOnboarding());
  })
  .post("/me/password", zValidator("json", changePasswordDto), async (c) => {
    return c.json(
      await trackRoute(c, { action: "USER_MODIFY", metadata: { passwordChanged: true } }, () =>
        c.var.service.changePassword(c.req.valid("json")),
      ),
    );
  })
  .post("/me/avatar", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new BadRequestError("Missing image file");
    return c.json(
      await trackRoute(c, { action: "USER_MODIFY", metadata: { avatarChanged: true } }, () =>
        c.var.service.uploadAvatar(file),
      ),
    );
  })
  .post("/me/letterboxd/import", requireModule("letterboxd"), async (c) => {
    c.header("X-Accel-Buffering", "no");
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) throw new BadRequestError("Missing zip file");
    return c.json(await c.var.service.importLetterboxd(file));
  })
  .post("/me/letterboxd/sync", requireModule("letterboxd"), async (c) => {
    // Diary RSS can be large; TMDB batching is rate-limited (~10 req/s).
    c.header("X-Accel-Buffering", "no");
    return c.json(await c.var.service.syncLetterboxd());
  })
  .get("/:id/stats", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.getStats(id));
  })
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await c.var.service.get(id));
  })
  .use("*", requireRole("admin"))
  .get("/", zValidator("query", listUsersDto), async (c) => {
    return c.json(await c.var.service.searchPaginated(c.req.valid("query")));
  })
  .post("/", zValidator("json", createUserDto), async (c) => {
    const body = c.req.valid("json");
    return c.json(
      await trackRoute(
        c,
        {
          action: "USER_CREATE",
          metadata: { username: body.username, role: body.role },
        },
        () => c.var.service.create(c.get("user"), body),
      ),
    );
  })
  .put("/:id", zValidator("param", stringIdParamDto), zValidator("json", updateUserDto), async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(await trackRoute(c, { action: "USER_MODIFY" }, () => c.var.service.update(c.get("user"), id, body)));
  })
  .delete("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    const target = await c.var.service.get(id);
    return c.json(
      await trackRoute(c, { action: "USER_DELETE", metadata: { username: target.username, role: target.role } }, () =>
        c.var.service.delete(c.get("user"), id),
      ),
    );
  });
