import { and, eq } from "drizzle-orm";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { downloadRepository } from "@/modules/download/download.repository";
import { parseWatchedAt, WATCHED_RATIO } from "@/modules/media/media.helper";
import { mediaRepository } from "@/modules/media/media.repository";
import type { MediaInsert } from "@/modules/media/media.schema";
import { userLikes, userReviews, userWatchList, watchProgress } from "@/modules/media/media.schema";

export type ReviewConflictMode = "overwrite" | "freshest";

export interface UserReviewInput {
  score: number;
  comment?: string | null;
  watchedAt?: string;
}

const TOGGLE_TABLE_MAP = {
  like: userLikes,
  watchlist: userWatchList,
} as const;

export const mediaRelationsRepository = {
  toggle: async (
    userId: string,
    mode: keyof typeof TOGGLE_TABLE_MAP,
    data: MediaInsert,
  ): Promise<{ added: boolean }> => {
    if (!data.id) throw new BadRequestError("Media ID is required");

    const table = TOGGLE_TABLE_MAP[mode];
    const tableQuery = mode === "like" ? db.query.userLikes : db.query.userWatchList;

    const existing = await tableQuery.findFirst({
      columns: { userId: true },
      where: and(eq(table.userId, userId), eq(table.mediaId, data.id)),
    });

    if (existing) {
      await db.delete(table).where(and(eq(table.userId, userId), eq(table.mediaId, data.id)));
      return { added: false };
    }

    if (!(await mediaRepository.exists(data.id))) await mediaRepository.upsert(data);
    await db.insert(table).values({ userId, mediaId: data.id });
    return { added: true };
  },

  upsertReview: async (
    userId: string,
    mediaId: number,
    input: UserReviewInput,
    mediaData?: MediaInsert,
  ): Promise<void> => {
    if (!(await mediaRepository.exists(mediaId))) {
      if (!mediaData) throw new NotFoundError("Media");
      await mediaRepository.upsert(mediaData);
    }

    const now = new Date();
    const createdAt = input.watchedAt ? parseWatchedAt(input.watchedAt) : now;

    await db
      .insert(userReviews)
      .values({
        userId,
        mediaId,
        score: input.score,
        comment: input.comment ?? null,
        createdAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userReviews.userId, userReviews.mediaId],
        set: {
          score: input.score,
          comment: input.comment ?? null,
          updatedAt: now,
          ...(input.watchedAt ? { createdAt } : {}),
        },
      });
  },

  deleteReview: async (userId: string, mediaId: number): Promise<void> => {
    await db.delete(userReviews).where(and(eq(userReviews.userId, userId), eq(userReviews.mediaId, mediaId)));
  },

  updateProgress: async (
    userId: string,
    mediaId: number,
    input: { downloadId?: string; position: number; duration: number },
  ): Promise<void> => {
    if (input.downloadId) await downloadRepository.get(input.downloadId);

    const update = {
      userId,
      downloadId: input.downloadId ?? null,
      position: input.position,
      duration: input.duration,
      completed: input.duration > 0 && input.position / input.duration >= WATCHED_RATIO,
      mediaId,
      updatedAt: new Date(),
    };

    await db
      .insert(watchProgress)
      .values(update)
      .onConflictDoUpdate({ target: [watchProgress.userId, watchProgress.mediaId], set: update });
  },

  applyUserReview: async (
    userId: string,
    mediaId: number,
    input: { score: number | null; comment: string | null; watchedAt: Date | null },
    mode: ReviewConflictMode,
  ): Promise<void> => {
    if (input.score == null && !input.comment) return;

    const now = new Date();
    const createdAt = input.watchedAt ?? now;
    const score = input.score ?? 0;
    const comment = input.comment;

    if (mode === "freshest") {
      const existing = await db.query.userReviews.findFirst({
        where: and(eq(userReviews.userId, userId), eq(userReviews.mediaId, mediaId)),
        columns: { createdAt: true, updatedAt: true },
      });
      if (existing) {
        const existingTime = Math.max(existing.createdAt?.getTime() ?? 0, existing.updatedAt?.getTime() ?? 0);
        const incomingTime = input.watchedAt?.getTime() ?? now.getTime();
        if (incomingTime < existingTime) return;
      }
    }

    await db
      .insert(userReviews)
      .values({ userId, mediaId, score, comment, createdAt, updatedAt: now })
      .onConflictDoUpdate({
        target: [userReviews.userId, userReviews.mediaId],
        set: {
          score,
          comment,
          updatedAt: now,
          ...(input.watchedAt ? { createdAt: input.watchedAt } : mode === "overwrite" ? { createdAt } : {}),
        },
      });
  },

  ensureUserLike: async (userId: string, mediaId: number): Promise<void> => {
    await db.insert(userLikes).values({ userId, mediaId }).onConflictDoNothing();
  },

  ensureUserWatchList: async (userId: string, mediaId: number): Promise<void> => {
    await db.insert(userWatchList).values({ userId, mediaId }).onConflictDoNothing();
  },

  markMediaWatched: async (userId: string, mediaId: number, durationMinutes?: number | null): Promise<void> => {
    const now = new Date();
    const durationSec = durationMinutes && durationMinutes > 0 ? Math.floor(durationMinutes * 60) : 1;
    const update = {
      userId,
      mediaId,
      downloadId: null as string | null,
      position: durationSec,
      duration: durationSec,
      completed: true,
      updatedAt: now,
    };

    await db
      .insert(watchProgress)
      .values(update)
      .onConflictDoUpdate({
        target: [watchProgress.userId, watchProgress.mediaId],
        set: {
          completed: true,
          position: durationSec,
          duration: durationSec,
          updatedAt: now,
        },
      });
  },
};
