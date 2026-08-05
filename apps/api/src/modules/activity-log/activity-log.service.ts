import type { ListActivityLogsQuery } from "@seedarr/contracts";
import { formatError } from "@seedarr/shared";
import { and, desc, eq } from "drizzle-orm";

import { ForbiddenError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import type { ActivityLogAction, ActivityLogType } from "./activity-log.schema";
import { type ActivityLog, activityLog } from "./activity-log.schema";

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
      logger.error("ACTIVITY_LOG", `Failed to insert log: ${formatError(err)}`);
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
