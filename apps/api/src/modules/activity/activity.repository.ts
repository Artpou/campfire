import { and, count, desc, eq, exists, inArray, like, or, type SQL } from "drizzle-orm";

import { db } from "@/db/db";
import { type MediaSelect, media } from "@/modules/media/media.schema";
import type { ModuleRow } from "@/modules/module/module.schema";
import type { User } from "@/modules/user/user.schema";
import type { Activity, ActivityAction, ActivityInsert, ActivityType } from "./activity.schema";
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

export const activityRepository = {
  insert: async (values: ActivityInsert): Promise<void> => {
    await db.insert(activityLog).values(values);
  },

  list: async (options: { where?: SQL; limit?: number; offset?: number }): Promise<ActivityListItem[]> => {
    return db.query.activityLog.findMany({
      where: options.where,
      orderBy: desc(activityLog.createdAt),
      with: {
        user: { columns: activityUserColumns },
        media: true,
        module: { columns: activityModuleColumns },
      },
      limit: options.limit,
      offset: options.offset,
    });
  },

  count: async (options: { where?: SQL }): Promise<number> => {
    const [result] = await db.select({ count: count() }).from(activityLog).where(options.where);
    return result?.count ?? 0;
  },

  buildSearchFilter: (pattern: string) =>
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

  buildUserFilter: (userId: string) => eq(activityLog.userId, userId),
  buildActionFilter: (action: ActivityAction) => eq(activityLog.action, action),
  buildTypeFilter: (type: ActivityType) => eq(activityLog.type, type),
  buildCategoryFilter: (actions: ActivityAction[]) => inArray(activityLog.action, actions),
};
