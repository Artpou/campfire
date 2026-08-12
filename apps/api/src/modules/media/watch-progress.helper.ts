import { and, eq, or, sql } from "drizzle-orm";

import { watchProgress } from "@/modules/media/media.schema";

/** Progress ratio at which a watch is considered completed. */
export const WATCHED_RATIO = 0.95;

/** True when progress is marked completed or position/duration crosses {@link WATCHED_RATIO}. */
export function isWatched(progress: { completed: boolean; position: number; duration: number } | undefined): boolean {
  if (!progress) return false;
  if (progress.completed) return true;
  if (progress.duration <= 0) return false;
  return progress.position / progress.duration >= WATCHED_RATIO;
}

/** SQL: completed flag OR position/duration >= WATCHED_RATIO. */
export function watchedProgressSql() {
  return or(
    eq(watchProgress.completed, true),
    sql`${watchProgress.duration} > 0 AND CAST(${watchProgress.position} AS REAL) / ${watchProgress.duration} >= ${WATCHED_RATIO}`,
  );
}

/** SQL: not completed and 0 < ratio < WATCHED_RATIO. */
export function inProgressProgressSql() {
  return and(
    eq(watchProgress.completed, false),
    sql`${watchProgress.duration} > 0 AND ${watchProgress.position} > 0 AND CAST(${watchProgress.position} AS REAL) / ${watchProgress.duration} < ${WATCHED_RATIO}`,
  );
}
