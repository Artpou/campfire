import type { ListMediaQuery } from "@seedarr/contracts";
import { and, asc, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { paginate } from "@/shared/helpers/pagination.helper";
import { order } from "@/shared/sql/base.sql";

import { db } from "@/db/db";
import { download } from "@/modules/download/download.schema";
import { visibleDownloadSql } from "@/modules/download/download.sql";
import { isWatched } from "@/modules/media/media.helper";
import { media, userLikes, userReviews, userWatchList, watchProgress } from "@/modules/media/media.schema";
import {
  activityAtSql,
  downloadCreatedAtSql,
  existMediaRelation,
  inProgressProgressSql,
  libraryRankSql,
  progressRatioSql,
  scalarUserRelation,
  sortDateSql,
  watchedProgressSql,
} from "@/modules/media/media.sql";
import type { MediaEnriched } from "@/modules/media/media.types";

/** Shared read path for enriched media lists (user-scoped relations + downloads). */
export async function listEnrichedMedia(userId: string, query: ListMediaQuery = {}): Promise<MediaEnriched[]> {
  const { type, filter, ids, with_genres: withGenres } = query;

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
      conditions.push(existMediaRelation(download, undefined, await visibleDownloadSql()));
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
      orderBy.push(asc(libraryRankSql(userId)));
      if (!query.sortBy) {
        orderBy.push(desc(downloadCreatedAtSql()));
      }
      break;
  }

  const rows = await db.query.media.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy,
    with: {
      downloads: {
        where: await visibleDownloadSql(),
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
    const activityAt = review?.createdAt ?? (watched ? progressItem?.updatedAt : undefined) ?? like?.createdAt ?? null;

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

export const mediaListRepository = {
  listEnriched: listEnrichedMedia,
};
