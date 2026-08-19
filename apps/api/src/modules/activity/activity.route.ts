import { zValidator } from "@hono/zod-validator";
import { listActivityDto } from "@seedarr/contracts";

import { requireRole } from "@/modules/auth/role.guard";
import { ActivityService } from "./activity.service";

export const activityRoutes = ActivityService.createRouter()
  .use("*", requireRole("member"))
  .get("/", zValidator("query", listActivityDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  });
