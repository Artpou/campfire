import type { LetterboxdSyncResponse, UpsertReviewInput } from "@seedarr/contracts";
import { and, desc, eq, exists, inArray, or, sql } from "drizzle-orm";

import { BadRequestError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import { download } from "@/modules/download/download.schema";
import { importLetterboxdZip } from "@/modules/media/letterboxd-import.service";
import { syncLetterboxdDiary } from "@/modules/media/letterboxd-sync.service";
import {
  type MediaInsert,
  media,
  userLikes,
  userReviews,
  userWatchList,
  watchProgress,
} from "@/modules/media/media.schema";
import { user } from "@/modules/user/user.schema";
import type { MediaEnriched } from "./media.types";

const WATCHED_RATIO = 0.95;

function isWatchedProgress(progress: { completed: boolean; position: number; duration: number } | undefined): boolean {
  if (!progress) return false;
  if (progress.completed) return true;
  if (progress.duration <= 0) return false;
  return progress.position / progress.duration >= WATCHED_RATIO;
}

function inProgressRank(item: MediaEnriched): number {
  const progress = item.progress;
  if (!progress || progress.duration <= 0) return 2;
  const ratio = progress.position / progress.duration;
  if (ratio > 0 && ratio < WATCHED_RATIO) return 0;
  return 1;
}

function parseWatchedAt(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export class MediaService extends IdentifiableService<MediaEnriched> {
  private canSeeAllDownloads(): boolean {
    return this.roleLevel >= ROLE_LEVELS.member;
  }

  private async assertCanViewUserCollection(
    targetUserId: string,
    filter: "like" | "watch-list" | "history" | "reviewed" | "calendar",
  ): Promise<void> {
    if (targetUserId === this.user.id) return;

    const target = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
      columns: { showWatchList: true, showLikes: true, showWatchHistory: true },
    });
    if (!target) throw new NotFoundError("User");

    if (filter === "calendar") {
      if (!target.showLikes && !target.showWatchHistory) {
        throw new ForbiddenError("This collection is private");
      }
      return;
    }

    const allowed =
      filter === "watch-list"
        ? target.showWatchList
        : filter === "history"
          ? target.showWatchHistory
          : target.showLikes;

    if (!allowed) {
      throw new ForbiddenError("This collection is private");
    }
  }

  private async getCalendarVisibility(
    targetUserId: string,
  ): Promise<{ includeSocial: boolean; includeHistory: boolean }> {
    if (targetUserId === this.user.id) {
      return { includeSocial: true, includeHistory: true };
    }

    const target = await db.query.user.findFirst({
      where: eq(user.id, targetUserId),
      columns: { showLikes: true, showWatchHistory: true },
    });
    if (!target) throw new NotFoundError("User");

    return {
      includeSocial: Boolean(target.showLikes),
      includeHistory: Boolean(target.showWatchHistory),
    };
  }

  async getMany(
    pagination: Partial<{ page?: number; limit?: number; ids?: string[]; userId?: string }>,
  ): Promise<MediaEnriched[]> {
    const paginationOpts = pagination.page && pagination.limit ? paginate(pagination) : {};
    const downloadOwnerFilter = this.canSeeAllDownloads() ? undefined : eq(download.userId, this.user.id);
    const enrichUserId = pagination.userId ?? this.user.id;

    const rows = await db.query.media.findMany({
      where: pagination.ids ? inArray(media.id, pagination.ids?.map(Number) ?? []) : undefined,
      with: {
        downloads: {
          where: downloadOwnerFilter,
          orderBy: desc(download.createdAt),
          limit: 1,
        },
        progress: { where: eq(watchProgress.userId, enrichUserId), limit: 1 },
        likes: {
          where: eq(userLikes.userId, enrichUserId),
          limit: 1,
          columns: { createdAt: true },
        },
        reviews: {
          where: eq(userReviews.userId, enrichUserId),
          limit: 1,
          columns: { score: true, comment: true, createdAt: true },
        },
      },
      extras: (fields) => ({
        liked: sql<boolean>`EXISTS (
          SELECT 1 FROM ${userLikes} WHERE ${userLikes.mediaId} = ${fields.id} AND ${userLikes.userId} = ${enrichUserId}
        )`
          .mapWith(Boolean)
          .as("liked"),
        inWatchList: sql<boolean>`EXISTS (
          SELECT 1 FROM ${userWatchList} WHERE ${userWatchList.mediaId} = ${fields.id} AND ${userWatchList.userId} = ${enrichUserId}
        )`
          .mapWith(Boolean)
          .as("inWatchList"),
      }),
      ...paginationOpts,
    });

    return rows.map((row) => {
      const { downloads, progress, reviews, likes, liked, inWatchList, ...mediaItem } = row;
      const review = reviews[0];
      const like = likes[0];
      const progressItem = progress[0];
      const watched = isWatchedProgress(progressItem);
      const activityAt =
        review?.createdAt ?? (watched ? progressItem?.updatedAt : undefined) ?? like?.createdAt ?? null;

      return {
        ...mediaItem,
        liked: Boolean(liked),
        inWatchList: Boolean(inWatchList),
        userScore: review?.score ?? null,
        userComment: review?.comment ?? null,
        userReviewAt: review?.createdAt ?? null,
        activityAt,
        download: downloads[0],
        progress: progressItem
          ? {
              position: progressItem.position,
              duration: progressItem.duration,
              downloadId: progressItem.downloadId,
              completed: progressItem.completed,
              updatedAt: progressItem.updatedAt,
            }
          : undefined,
      };
    });
  }

  async list(query: import("@seedarr/contracts").ListMediaQuery): Promise<Paginate<MediaEnriched>> {
    const { type, filter, ids, userId } = query;
    const targetUserId = userId ?? this.user.id;

    if (
      filter === "like" ||
      filter === "watch-list" ||
      filter === "history" ||
      filter === "reviewed" ||
      filter === "calendar"
    ) {
      await this.assertCanViewUserCollection(targetUserId, filter);
    }

    const conditions = [];
    if (type) conditions.push(eq(media.type, type));
    if (ids) conditions.push(inArray(media.id, ids.map(Number)));

    if (filter) {
      if (filter === "history") {
        conditions.push(
          exists(
            db
              .select()
              .from(watchProgress)
              .where(and(eq(watchProgress.userId, targetUserId), eq(watchProgress.mediaId, media.id))),
          ),
        );
      } else if (filter === "reviewed") {
        conditions.push(
          or(
            exists(
              db
                .select()
                .from(userReviews)
                .where(and(eq(userReviews.userId, targetUserId), eq(userReviews.mediaId, media.id))),
            ),
            exists(
              db
                .select()
                .from(userLikes)
                .where(and(eq(userLikes.userId, targetUserId), eq(userLikes.mediaId, media.id))),
            ),
          ),
        );
      } else if (filter === "calendar") {
        const { includeSocial, includeHistory } = await this.getCalendarVisibility(targetUserId);
        const calendarParts = [];

        if (includeSocial) {
          calendarParts.push(
            exists(
              db
                .select()
                .from(userReviews)
                .where(and(eq(userReviews.userId, targetUserId), eq(userReviews.mediaId, media.id))),
            ),
            exists(
              db
                .select()
                .from(userLikes)
                .where(and(eq(userLikes.userId, targetUserId), eq(userLikes.mediaId, media.id))),
            ),
          );
        }

        if (includeHistory) {
          calendarParts.push(
            exists(
              db
                .select()
                .from(watchProgress)
                .where(
                  and(
                    eq(watchProgress.userId, targetUserId),
                    eq(watchProgress.mediaId, media.id),
                    or(
                      eq(watchProgress.completed, true),
                      sql`${watchProgress.duration} > 0 AND CAST(${watchProgress.position} AS REAL) / ${watchProgress.duration} >= ${WATCHED_RATIO}`,
                    ),
                  ),
                ),
            ),
          );
        }

        if (calendarParts.length === 0) {
          throw new ForbiddenError("This collection is private");
        }

        conditions.push(or(...calendarParts));
      } else {
        const FILTER_TABLE_MAP = {
          like: userLikes,
          "watch-list": userWatchList,
          downloaded: download,
        } as const;

        const table = FILTER_TABLE_MAP[filter];
        const scopeToUser = filter !== "downloaded" || !this.canSeeAllDownloads();
        const filterUserId = userId ?? (scopeToUser ? this.user.id : undefined);
        conditions.push(
          exists(
            db
              .select()
              .from(table)
              .where(and(filterUserId ? eq(table.userId, filterUserId) : undefined, eq(table.mediaId, media.id))),
          ),
        );
      }
    }

    const mediaIds = (
      await db
        .select({ id: media.id })
        .from(media)
        .where(and(...conditions))
    ).map((m) => m.id.toString());

    const items = await this.getMany({
      ids: mediaIds,
      userId: targetUserId,
    });

    if (filter === "calendar") {
      items.sort((a, b) => (b.activityAt?.getTime() ?? 0) - (a.activityAt?.getTime() ?? 0));
    } else if (filter === "downloaded") {
      items.sort((a, b) => inProgressRank(a) - inProgressRank(b));
    }

    // Full list is loaded then sorted — apply page window before toPaginate (hasMore sentinel).
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    return toPaginate(items.slice(offset, offset + limit + 1), { page, limit });
  }

  async upsert(data: MediaInsert): Promise<MediaEnriched> {
    if (!data.id) throw new BadRequestError("Media ID is required");

    await db.insert(media).values(data).onConflictDoUpdate({ target: media.id, set: data });

    const result = await this.get(data.id.toString());
    if (!result) throw new NotFoundError("Media");
    return result;
  }

  private async _toggle(mode: "like" | "watchlist", data: MediaInsert): Promise<MediaEnriched | undefined> {
    if (!data.id) throw new BadRequestError("Media ID is required");

    const table = mode === "like" ? userLikes : userWatchList;
    const tableQuery = mode === "like" ? db.query.userLikes : db.query.userWatchList;

    const existing = await tableQuery.findFirst({
      columns: { userId: true },
      where: and(eq(table.userId, this.user.id), eq(table.mediaId, data.id)),
    });

    if (existing) {
      await db.delete(table).where(and(eq(table.userId, this.user.id), eq(table.mediaId, data.id)));
    } else {
      const existingMedia = await db.query.media.findFirst({ where: eq(media.id, data.id) });
      if (!existingMedia) await this.upsert(data);

      await db.insert(table).values({ userId: this.user.id, mediaId: data.id });
    }

    return this.get(data.id.toString());
  }

  async toggleLike(data: MediaInsert): Promise<MediaEnriched | undefined> {
    return this._toggle("like", data);
  }

  async toggleWatchList(data: MediaInsert): Promise<MediaEnriched | undefined> {
    return this._toggle("watchlist", data);
  }

  async upsertReview(
    mediaId: number,
    input: Pick<UpsertReviewInput, "score" | "comment" | "watchedAt">,
    mediaData?: MediaInsert,
  ): Promise<MediaEnriched> {
    const existingMedia = await db.query.media.findFirst({ where: eq(media.id, mediaId) });
    if (!existingMedia) {
      if (!mediaData) throw new NotFoundError("Media");
      await this.upsert(mediaData);
    }

    const now = new Date();
    const createdAt = input.watchedAt ? parseWatchedAt(input.watchedAt) : now;

    await db
      .insert(userReviews)
      .values({
        userId: this.user.id,
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

    return this.get(mediaId.toString());
  }

  async deleteReview(mediaId: number): Promise<MediaEnriched> {
    await db.delete(userReviews).where(and(eq(userReviews.userId, this.user.id), eq(userReviews.mediaId, mediaId)));
    return this.get(mediaId.toString());
  }

  async syncLetterboxd(): Promise<LetterboxdSyncResponse> {
    return syncLetterboxdDiary(this.user.id);
  }

  async importLetterboxd(file: File): Promise<LetterboxdSyncResponse> {
    return importLetterboxdZip(this.user.id, file);
  }

  async updateProgress(mediaId: number, input: import("@seedarr/contracts").UpdateProgressQuery): Promise<void> {
    const update = {
      userId: this.user.id,
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
  }
}
