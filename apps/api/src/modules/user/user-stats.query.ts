import type { UserStats } from "@seedarr/contracts";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { media, userLikes, userReviews, watchProgress } from "@/modules/media/media.schema";
import { watchedProgressSql } from "@/modules/media/watch-progress.helper";

export async function getUserStats(userId: string): Promise<UserStats> {
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
}
