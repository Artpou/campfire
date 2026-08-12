import type { ListMediaQuery, UpdateProgressQuery, UpsertReviewInput } from "@seedarr/contracts";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";
import { paginate } from "@/shared/helpers/pagination.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";
import { order } from "@/shared/sql/base.sql";

import { db } from "@/db/db";
import { assertDownloadExists } from "@/modules/download/download.guard";
import { download } from "@/modules/download/download.schema";
import { assertMediaId, parseWatchedAt } from "@/modules/media/media.guard";
import {
  type MediaInsert,
  media,
  userLikes,
  userReviews,
  userWatchList,
  watchProgress,
} from "@/modules/media/media.schema";
import {
  activityAtSql,
  existMediaRelation,
  inProgressRankSql,
  progressRatioSql,
  scalarUserRelation,
  sortDateSql,
} from "@/modules/media/media.sql";
import {
  inProgressProgressSql,
  isWatched,
  WATCHED_RATIO,
  watchedProgressSql,
} from "@/modules/media/watch-progress.helper";
import type { MediaEnriched } from "./media.types";

const TOGGLE_TABLE_MAP = {
  like: userLikes,
  watchlist: userWatchList,
} as const;

export class MediaService extends IdentifiableService<MediaEnriched> {
  async getMany(query: ListMediaQuery = {}): Promise<MediaEnriched[]> {
    const { type, filter, ids, with_genres: withGenres } = query;
    const userId = query.userId ?? this.user.id;

    const conditions = [];
    if (type) conditions.push(eq(media.type, type));
    if (ids) conditions.push(inArray(media.id, ids.map(Number)));

    if (withGenres) {
      const genreNames = withGenres
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean);
      if (genreNames.length > 0) {
        conditions.push(or(...genreNames.map((name) => like(media.categories, `%${name}%`))));
      }
    }

    switch (filter) {
      case "history":
        conditions.push(existMediaRelation(watchProgress, userId));
        break;
      case "in-progress":
        conditions.push(existMediaRelation(watchProgress, userId, inProgressProgressSql()));
        break;
      case "reviewed":
        conditions.push(or(existMediaRelation(userReviews, userId), existMediaRelation(userLikes, userId)));
        break;
      case "calendar":
        conditions.push(
          or(
            existMediaRelation(userReviews, userId),
            existMediaRelation(userLikes, userId),
            existMediaRelation(watchProgress, userId, watchedProgressSql()),
          ),
        );
        break;
      case "like":
        conditions.push(existMediaRelation(userLikes, userId));
        break;
      case "watch-list":
        conditions.push(existMediaRelation(userWatchList, userId));
        break;
      case "downloaded":
        conditions.push(existMediaRelation(download));
        break;
    }

    const orderBy = [];
    switch (query.sortBy) {
      case "title":
        orderBy.push(order(sql`COALESCE(${media.title}, ${media.original_title}, '')`, query.sortOrder));
        break;
      case "date":
        orderBy.push(order(sortDateSql(userId), query.sortOrder));
        break;
      case "score":
        orderBy.push(order(scalarUserRelation(userReviews, userReviews.score, media.id, { userId }), query.sortOrder));
        break;
      case "progress":
        orderBy.push(order(progressRatioSql(userId), query.sortOrder));
        break;
    }
    switch (filter) {
      case "calendar":
        orderBy.push(desc(activityAtSql(userId)));
        break;
      case "downloaded":
        orderBy.push(asc(inProgressRankSql(userId)));
        break;
    }

    const rows = await db.query.media.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy,
      with: {
        downloads: {
          orderBy: desc(download.createdAt),
          limit: 1,
        },
        progress: { where: eq(watchProgress.userId, userId), limit: 1 },
        likes: {
          where: eq(userLikes.userId, userId),
          limit: 1,
          columns: { createdAt: true },
        },
        reviews: {
          where: eq(userReviews.userId, userId),
          limit: 1,
          columns: { score: true, comment: true, createdAt: true },
        },
      },
      extras: () => ({
        liked: existMediaRelation(userLikes, userId).mapWith(Boolean).as("liked"),
        inWatchList: existMediaRelation(userWatchList, userId).mapWith(Boolean).as("inWatchList"),
      }),
      ...(query.page && query.limit ? paginate(query) : {}),
    });

    return rows.map((row) => {
      const { downloads, progress, reviews, likes, liked, inWatchList, ...mediaItem } = row;
      const review = reviews[0];
      const like = likes[0];
      const progressItem = progress[0];
      const watched = isWatched(progressItem);
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

  async upsert(data: MediaInsert): Promise<MediaEnriched> {
    assertMediaId(data.id);
    await db.insert(media).values(data).onConflictDoUpdate({ target: media.id, set: data });
    const result = await this.get(data.id.toString());
    if (!result) throw new NotFoundError("Media");
    return result;
  }

  private async toggleUserMediaRelation(
    mode: keyof typeof TOGGLE_TABLE_MAP,
    data: MediaInsert,
  ): Promise<MediaEnriched | undefined> {
    assertMediaId(data.id);

    const table = TOGGLE_TABLE_MAP[mode];
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
    return this.toggleUserMediaRelation("like", data);
  }

  async toggleWatchList(data: MediaInsert): Promise<MediaEnriched | undefined> {
    return this.toggleUserMediaRelation("watchlist", data);
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

  /** Upserts watch progress and sets completed when ratio >= WATCHED_RATIO. */
  async updateProgress(mediaId: number, input: UpdateProgressQuery): Promise<void> {
    if (input.downloadId) await assertDownloadExists(input.downloadId);

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
