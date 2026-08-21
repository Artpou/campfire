import { and, desc, eq, exists, getTableName, or, type SQL, sql } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { isColumn, sqlColumn } from "@/shared/sql/base.sql";

import { db } from "@/db/db";
import { download } from "@/modules/download/download.schema";
import { WATCHED_RATIO } from "@/modules/media/media.helper";
import { media, userLikes, userReviews, watchProgress } from "@/modules/media/media.schema";

export type MediaRelatedTable = SQLiteTable & {
  userId: AnySQLiteColumn;
  mediaId: AnySQLiteColumn;
};

/** EXISTS (SELECT 1 FROM table WHERE mediaId = media.id [AND userId = ?] [AND extra]). */
export function existMediaRelation(table: MediaRelatedTable, userId?: string, extra?: SQL): SQL {
  const conditions = [eq(table.mediaId, media.id)];

  if (userId != null) conditions.push(eq(table.userId, userId));
  if (extra != null) conditions.push(extra);

  return exists(
    db
      .select()
      .from(table)
      .where(and(...conditions)),
  );
}

/**
 * Scalar subquery: SELECT col FROM table WHERE mediaId = parent [AND userId] … LIMIT 1.
 * Uses {@link sqlColumn} so nested use in media orderBy does not remap columns to `media.*`.
 */
export function scalarUserRelation(
  table: MediaRelatedTable,
  column: AnySQLiteColumn | SQL,
  parentId: AnySQLiteColumn | SQL,
  opts?: { userId?: string; extra?: SQL; orderBy?: SQL },
): SQL {
  const from = sql.identifier(getTableName(table));
  const selectExpr = isColumn(column) ? sqlColumn(table, column) : column;

  return sql`(
    SELECT ${selectExpr} FROM ${from}
    WHERE ${sqlColumn(table, "mediaId")} = ${parentId}
      ${opts?.userId != null ? sql`AND ${sqlColumn(table, "userId")} = ${opts.userId}` : sql``}
      ${opts?.extra ? sql`AND ${opts.extra}` : sql``}
    ${opts?.orderBy ? sql`ORDER BY ${opts.orderBy}` : sql``}
    LIMIT 1
  )`;
}

/** Latest download createdAt for this media (any user — shared library). */
export function downloadCreatedAtSql(): SQL {
  return scalarUserRelation(download, download.createdAt, media.id, {
    orderBy: desc(sqlColumn(download, download.createdAt)),
  });
}

/** Active torrent/transfer for this media (JSON live data on download.torrent). */
function activeDownloadExistsSql(): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${sql.identifier("download")} d
    WHERE d.mediaId = ${media.id}
      AND d.torrent IS NOT NULL
      AND (
        json_extract(d.torrent, '$.transferring') = 1
        OR COALESCE(json_extract(d.torrent, '$.done'), 0) = 0
      )
  )`;
}

/**
 * Library default rank: active downloads → watch-in-progress → rest.
 * Pair with {@link downloadCreatedAtSql} desc when no explicit sortBy.
 */
export function libraryRankSql(userId: string): SQL {
  return sql`CASE
    WHEN ${activeDownloadExistsSql()} THEN 0
    WHEN EXISTS (
      SELECT 1 FROM ${sql.identifier("watchProgress")}
      WHERE ${sqlColumn(watchProgress, "mediaId")} = ${media.id}
        AND ${sqlColumn(watchProgress, "userId")} = ${userId}
        AND ${sqlColumn(watchProgress, "completed")} = 0
        AND ${sqlColumn(watchProgress, "duration")} > 0
        AND ${sqlColumn(watchProgress, "position")} > 0
        AND CAST(${sqlColumn(watchProgress, "position")} AS REAL) / ${sqlColumn(watchProgress, "duration")} < ${WATCHED_RATIO}
    ) THEN 1
    ELSE 2
  END`;
}

/** review.createdAt → watched progress.updatedAt → like.createdAt */
export function activityAtSql(userId: string): SQL {
  return sql`COALESCE(
    ${scalarUserRelation(userReviews, userReviews.createdAt, media.id, { userId: userId })},
    ${scalarUserRelation(watchProgress, watchProgress.updatedAt, media.id, {
      userId: userId,
      extra: sql`(
        ${sqlColumn(watchProgress, "completed")} = 1
        OR (
          ${sqlColumn(watchProgress, "duration")} > 0
          AND CAST(${sqlColumn(watchProgress, "position")} AS REAL) / ${sqlColumn(watchProgress, "duration")} >= ${WATCHED_RATIO}
        )
      )`,
    })},
    ${scalarUserRelation(userLikes, userLikes.createdAt, media.id, { userId: userId })}
  )`;
}

export function progressRatioSql(userId: string): SQL {
  return sql`COALESCE(${scalarUserRelation(
    watchProgress,
    sql`CASE
      WHEN ${sqlColumn(watchProgress, "duration")} > 0
        THEN CAST(${sqlColumn(watchProgress, "position")} AS REAL) / ${sqlColumn(watchProgress, "duration")}
      ELSE 0
    END`,
    media.id,
    { userId: userId },
  )}, 0)`;
}

export function sortDateSql(userId: string): SQL {
  return sql`COALESCE(
    ${downloadCreatedAtSql()},
    ${activityAtSql(userId)},
    ${scalarUserRelation(watchProgress, watchProgress.updatedAt, media.id, { userId })}
  )`;
}

/** SQL: completed flag OR position/duration >= WATCHED_RATIO. */
export function watchedProgressSql() {
  return or(
    eq(watchProgress.completed, true),
    sql`${watchProgress.duration} > 0 AND CAST(${watchProgress.position} AS REAL) / ${watchProgress.duration} >= ${WATCHED_RATIO}`,
  );
}

/** SQL: not completed and 0 < ratio < WATCHED_RATIO. */
export function inProgressProgressSql(): SQL | undefined {
  return and(
    eq(watchProgress.completed, false),
    sql`${watchProgress.duration} > 0 AND ${watchProgress.position} > 0 AND CAST(${watchProgress.position} AS REAL) / ${watchProgress.duration} < ${WATCHED_RATIO}`,
  );
}
