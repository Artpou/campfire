import type { UserStats } from "@seedarr/contracts";
import { and, asc, count, eq, inArray, like, or } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { media, userLikes, userReviews, watchProgress } from "@/modules/media/media.schema";
import { watchedProgressSql } from "@/modules/media/media.sql";
import { type NewUser, type User, user } from "@/modules/user/user.schema";

const userPublicColumns = {
  id: true,
  username: true,
  pseudo: true,
  avatarPath: true,
  role: true,
  letterboxdUsername: true,
  onboarded: true,
  createdAt: true,
} as const;

export type UserPublic = Pick<User, keyof typeof userPublicColumns>;

export const userRepository = {
  find: async (id: string): Promise<UserPublic | undefined> => {
    return (await db.query.user.findFirst({ where: eq(user.id, id), columns: userPublicColumns })) ?? undefined;
  },

  get: async (id: string): Promise<UserPublic> => {
    const row = await userRepository.find(id);
    if (!row) throw new NotFoundError("User");
    return row;
  },

  findByUsername: async (username: string): Promise<UserPublic | undefined> => {
    return (
      (await db.query.user.findFirst({ where: eq(user.username, username), columns: userPublicColumns })) ?? undefined
    );
  },

  findFullByUsername: async (username: string) => {
    return (await db.query.user.findFirst({ where: eq(user.username, username) })) ?? undefined;
  },

  findFullById: async (id: string) => {
    return (await db.query.user.findFirst({ where: eq(user.id, id) })) ?? undefined;
  },

  findByIds: async (ids: string[]): Promise<UserPublic[]> => {
    if (ids.length === 0) return [];
    return db.query.user.findMany({
      columns: userPublicColumns,
      where: inArray(user.id, ids),
    });
  },

  list: async (): Promise<UserPublic[]> => {
    return db.query.user.findMany({ columns: userPublicColumns });
  },

  search: async (term: string): Promise<UserPublic[]> => {
    const pattern = `%${term.replaceAll("\\", "").replaceAll("%", "").replaceAll("_", "")}%`;
    return db.query.user.findMany({
      columns: userPublicColumns,
      where: or(like(user.username, pattern), like(user.pseudo, pattern)),
    });
  },

  searchPage: async (options: { q?: string; limit?: number; offset?: number }): Promise<UserPublic[]> => {
    const term = options.q?.trim();
    const pattern = term ? `%${term.replaceAll("\\", "").replaceAll("%", "").replaceAll("_", "")}%` : undefined;
    return db.query.user.findMany({
      columns: userPublicColumns,
      where: pattern ? or(like(user.username, pattern), like(user.pseudo, pattern)) : undefined,
      limit: options.limit,
      offset: options.offset,
      orderBy: [asc(user.username)],
    });
  },

  searchCount: async (q?: string): Promise<number> => {
    const term = q?.trim();
    if (!term) return userRepository.count();
    const pattern = `%${term.replaceAll("\\", "").replaceAll("%", "").replaceAll("_", "")}%`;
    const [result] = await db
      .select({ count: count() })
      .from(user)
      .where(or(like(user.username, pattern), like(user.pseudo, pattern)));
    return result?.count ?? 0;
  },

  count: async (): Promise<number> => {
    const [result] = await db.select({ count: count() }).from(user);
    return result?.count ?? 0;
  },

  hasOwner: async (): Promise<boolean> => {
    const row = await db.query.user.findFirst({ where: eq(user.role, "owner"), columns: { id: true } });
    return row != null;
  },

  usernameExists: async (username: string): Promise<boolean> => {
    const row = await db.query.user.findFirst({ where: eq(user.username, username), columns: { id: true } });
    return row != null;
  },

  insert: async (values: Omit<NewUser, "id"> & { id?: string }): Promise<UserPublic> => {
    const [created] = await db.insert(user).values(values).returning({
      id: user.id,
      username: user.username,
      pseudo: user.pseudo,
      avatarPath: user.avatarPath,
      role: user.role,
      letterboxdUsername: user.letterboxdUsername,
      onboarded: user.onboarded,
      createdAt: user.createdAt,
    });
    if (!created) throw new NotFoundError("User");
    return created;
  },

  insertOwner: async (username: string, hashedPassword: string): Promise<UserPublic> => {
    return userRepository.insert({ username, password: hashedPassword, role: "owner" });
  },

  update: async (id: string, data: Partial<Omit<NewUser, "id" | "createdAt">>): Promise<void> => {
    await db.update(user).set(data).where(eq(user.id, id));
  },

  delete: async (id: string): Promise<void> => {
    await db.delete(user).where(eq(user.id, id));
  },

  getLetterboxdUsername: async (userId: string): Promise<string | null> => {
    const row = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { letterboxdUsername: true },
    });
    return row?.letterboxdUsername ?? null;
  },

  setLetterboxdUsername: async (userId: string, username: string): Promise<void> => {
    await db.update(user).set({ letterboxdUsername: username.toLowerCase() }).where(eq(user.id, userId));
  },

  getStats: async (userId: string): Promise<UserStats> => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const activityByMedia = new Map<number, { type: "movie" | "tv"; at: Date }>();

    const trackActivity = (mediaId: number, type: "movie" | "tv", at: Date | null | undefined) => {
      if (!at) return;
      const prev = activityByMedia.get(mediaId);
      if (!prev || at > prev.at) activityByMedia.set(mediaId, { type, at });
    };

    const reviewRows = await db
      .select({
        mediaId: userReviews.mediaId,
        score: userReviews.score,
        createdAt: userReviews.createdAt,
        type: media.type,
        title: media.title,
        poster_path: media.poster_path,
      })
      .from(userReviews)
      .innerJoin(media, eq(media.id, userReviews.mediaId))
      .where(eq(userReviews.userId, userId));

    for (const row of reviewRows) {
      trackActivity(row.mediaId, row.type, row.createdAt);
    }

    const likeRows = await db
      .select({
        mediaId: userLikes.mediaId,
        createdAt: userLikes.createdAt,
        type: media.type,
      })
      .from(userLikes)
      .innerJoin(media, eq(media.id, userLikes.mediaId))
      .where(eq(userLikes.userId, userId));

    for (const row of likeRows) {
      trackActivity(row.mediaId, row.type, row.createdAt);
    }

    const watchedRows = await db
      .select({
        mediaId: watchProgress.mediaId,
        updatedAt: watchProgress.updatedAt,
        type: media.type,
      })
      .from(watchProgress)
      .innerJoin(media, eq(media.id, watchProgress.mediaId))
      .where(and(eq(watchProgress.userId, userId), watchedProgressSql()));

    for (const row of watchedRows) {
      trackActivity(row.mediaId, row.type, row.updatedAt);
    }

    const watchedByType = {
      movie: { allTime: 0, thisYear: 0 },
      tv: { allTime: 0, thisYear: 0 },
    };

    for (const { type, at } of activityByMedia.values()) {
      watchedByType[type].allTime++;
      if (at >= yearStart) watchedByType[type].thisYear++;
    }

    const topRated = [...reviewRows]
      .sort((a, b) => b.score - a.score || (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 3)
      .map((row) => ({
        id: row.mediaId,
        type: row.type,
        title: row.title,
        poster_path: row.poster_path,
        score: row.score,
      }));

    return {
      movies: watchedByType.movie,
      tv: watchedByType.tv,
      topRated,
    };
  },
};
