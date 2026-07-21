import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { ForbiddenError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import type { Paginate } from "@/helpers/pagination.dto";
import { paginate, toPaginate } from "@/helpers/pagination.helper";
import { AuthenticatedService } from "@/modules/auth/auth.service";
import type { ActivityLog, ListActivityLogsQuery } from "./activity-log.dto";
import type { ActivityLogAction, ActivityLogType } from "./activity-log.schema";
import { activityLog } from "./activity-log.schema";

export class ActivityLogService extends AuthenticatedService {
  static async log(params: {
    userId?: string;
    type: ActivityLogType;
    action: ActivityLogAction;
    title: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db.insert(activityLog).values({
        userId: params.userId ?? null,
        type: params.type,
        action: params.action,
        title: params.title,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      });
    } catch (err) {
      logger.error("ACTIVITY_LOG", `Failed to insert log: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async list(query: ListActivityLogsQuery): Promise<Paginate<ActivityLog>> {
    if (this.user.role === "viewer") throw new ForbiddenError();

    const conditions = [];
    if (this.roleLevel < 3) conditions.push(eq(activityLog.userId, this.user.id));
    if (query.action) conditions.push(eq(activityLog.action, query.action));
    if (query.type) conditions.push(eq(activityLog.type, query.type));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const paginationOpts = query.page && query.limit ? paginate(query) : {};

    const items = await db.query.activityLog.findMany({
      where,
      orderBy: desc(activityLog.createdAt),
      ...paginationOpts,
    });

    return toPaginate(items, query);
  }
}
