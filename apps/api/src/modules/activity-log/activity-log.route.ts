import { zValidator } from "@hono/zod-validator";

import { requireRole } from "@/modules/auth/role.guard";
import { listActivityLogsDto } from "./activity-log.dto";
import { ActivityLogService } from "./activity-log.service";

export const activityLogRoutes = ActivityLogService.createRouter()
  .use("*", requireRole("member"))
  .get("/", zValidator("query", listActivityLogsDto), async (c) => {
    return c.json(await c.var.service.list(c.req.valid("query")));
  });
