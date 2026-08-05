import { zValidator } from "@hono/zod-validator";
import { listActivityLogsDto } from "@seedarr/contracts";

import { requireRole } from "@/modules/auth/role.guard";
import { ActivityLogService } from "./activity-log.service";

export const activityLogRoutes = ActivityLogService.createRouter()
  .use("*", requireRole("member"))
  .get("/", zValidator("query", listActivityLogsDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  });
