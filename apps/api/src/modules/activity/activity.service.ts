import type { ActivityAction, ActivityType, ListActivityQuery } from "@seedarr/contracts";
import { formatError } from "@seedarr/shared";
import { and, desc, eq, exists, inArray, like, or } from "drizzle-orm";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { ForbiddenError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { type MediaSelect, media } from "@/modules/media/media.schema";
import type { ModuleRow } from "@/modules/module/module.schema";
import type { User } from "@/modules/user/user.schema";
import { actionsForCategory, sanitizeActivityMetadata } from "./activity.helper";
import type { Activity, ActivityAction as SchemaAction, ActivityType as SchemaType } from "./activity.schema";
import { activityLog } from "./activity.schema";

const activityUserColumns = {
  id: true,
  username: true,
  pseudo: true,
  avatarPath: true,
  role: true,
} as const;

const activityModuleColumns = {
  id: true,
  type: true,
  category: true,
} as const;

export type ActivityListItem = Activity & {
  user: Pick<User, "id" | "username" | "pseudo" | "avatarPath" | "role"> | null;
  media: MediaSelect | null;
  module: Pick<ModuleRow, "id" | "type" | "category"> | null;
};

export type ActivityLogInput = {
  action: ActivityAction;
  type?: ActivityType;
  mediaId?: number | null;
  moduleId?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string;
};

export type TrackInput<T = unknown> = ActivityLogInput & {
  resolve?: (result: T) => Partial<ActivityLogInput>;
};

function likePattern(q: string): string {
  return `%${q.replaceAll("\\", "").replaceAll("%", "").replaceAll("_", "")}%`;
}

function mediaIdFromLog(params: { mediaId?: number | null; metadata?: Record<string, unknown> }): number | null {
  if (typeof params.mediaId === "number") return params.mediaId;
  if (typeof params.metadata?.mediaId === "number") return params.metadata.mediaId;
  return null;
}

function moduleIdFromLog(params: { moduleId?: string | null; metadata?: Record<string, unknown> }): string | null {
  if (typeof params.moduleId === "string" && params.moduleId) return params.moduleId;
  if (typeof params.metadata?.moduleId === "string" && params.metadata.moduleId) return params.metadata.moduleId;
  return null;
}

function contextUser(c: Context): User | undefined {
  return c.get("user") as User | undefined;
}

function typeFromError(error: unknown): ActivityType {
  if (error instanceof HTTPException) return error.status >= 500 ? "ERROR" : "WARNING";
  return "ERROR";
}

export class ActivityService extends AuthenticatedService {
  constructor(user?: User) {
    super((user ?? { id: "" }) as User);
  }

  async log(params: ActivityLogInput): Promise<void> {
    const userId = params.userId ?? (this.user.id || null);
    const metadata = params.metadata
      ? (sanitizeActivityMetadata(params.metadata) as Record<string, unknown>)
      : undefined;

    try {
      await db.insert(activityLog).values({
        userId,
        mediaId: mediaIdFromLog({ mediaId: params.mediaId, metadata }),
        moduleId: moduleIdFromLog({ moduleId: params.moduleId, metadata }),
        type: (params.type ?? "SUCCESS") as SchemaType,
        action: params.action as SchemaAction,
        metadata: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (err) {
      logger.error("ACTIVITY", `Failed to insert log: ${formatError(err)}`);
    }
  }

  async list(query: ListActivityQuery): Promise<Paginate<ActivityListItem>> {
    if (this.user.role === "viewer") throw new ForbiddenError();

    const conditions = [];
    if (this.roleLevel < 3) conditions.push(eq(activityLog.userId, this.user.id));
    if (query.action) conditions.push(eq(activityLog.action, query.action));
    if (query.type) conditions.push(eq(activityLog.type, query.type));
    if (query.category) conditions.push(inArray(activityLog.action, actionsForCategory(query.category)));

    const q = query.q?.trim();
    if (q) {
      const pattern = likePattern(q);
      conditions.push(
        or(
          like(activityLog.action, pattern),
          like(activityLog.metadata, pattern),
          exists(
            db
              .select({ id: media.id })
              .from(media)
              .where(and(eq(media.id, activityLog.mediaId), like(media.title, pattern))),
          ),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const paginationOpts = query.page && query.limit ? paginate(query) : {};

    const items = await db.query.activityLog.findMany({
      where,
      orderBy: desc(activityLog.createdAt),
      with: {
        user: { columns: activityUserColumns },
        media: true,
        module: { columns: activityModuleColumns },
      },
      ...paginationOpts,
    });

    return toPaginate(items, query);
  }
}

export function activityFor(userId?: string | null): ActivityService {
  return new ActivityService(userId ? ({ id: userId } as User) : undefined);
}

export async function trackRoute<T>(c: Context, input: TrackInput<T>, fn: () => T | Promise<T>): Promise<T> {
  const service = new ActivityService(contextUser(c));
  try {
    const result = await fn();
    const extra = input.resolve?.(result) ?? {};
    await service.log({
      action: extra.action ?? input.action,
      type: extra.type ?? input.type ?? "SUCCESS",
      mediaId: extra.mediaId ?? input.mediaId,
      moduleId: extra.moduleId ?? input.moduleId,
      metadata: { ...input.metadata, ...extra.metadata },
      userId: extra.userId ?? input.userId,
    });
    return result;
  } catch (error) {
    await service.log({
      action: input.action,
      type: typeFromError(error),
      mediaId: input.mediaId,
      moduleId: input.moduleId,
      metadata: { ...input.metadata, error: formatError(error) },
      userId: input.userId,
    });
    throw error;
  }
}
