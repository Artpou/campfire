import { and, eq } from "drizzle-orm";

import { db } from "@/db/db";
import {
  type MediaInsert,
  media,
  userLikes,
  userReviews,
  userWatchList,
  watchProgress,
} from "@/modules/media/media.schema";

export type ReviewConflictMode = "overwrite" | "freshest";

export interface LetterboxdReviewInput {
  score: number | null;
  comment: string | null;
  watchedAt: Date | null;
}

export async function upsertMediaRow(insert: MediaInsert): Promise<void> {
  await db.insert(media).values(insert).onConflictDoUpdate({ target: media.id, set: insert });
}

export async function applyUserReview(
  userId: string,
  mediaId: number,
  input: LetterboxdReviewInput,
  mode: ReviewConflictMode,
): Promise<void> {
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
    .values({
      userId,
      mediaId,
      score,
      comment,
      createdAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userReviews.userId, userReviews.mediaId],
      set: {
        score,
        comment,
        updatedAt: now,
        ...(input.watchedAt ? { createdAt: input.watchedAt } : mode === "overwrite" ? { createdAt } : {}),
      },
    });
}

export async function ensureUserLike(userId: string, mediaId: number): Promise<void> {
  await db.insert(userLikes).values({ userId, mediaId }).onConflictDoNothing();
}

export async function ensureUserWatchList(userId: string, mediaId: number): Promise<void> {
  await db.insert(userWatchList).values({ userId, mediaId }).onConflictDoNothing();
}

/** Mark as watched (completed). Front treats `completed` as watched regardless of ratio. */
export async function markMediaWatched(
  userId: string,
  mediaId: number,
  durationMinutes?: number | null,
): Promise<void> {
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
}
