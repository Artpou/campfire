import type { LetterboxdSyncResponse } from "@seedarr/contracts";
import { eq } from "drizzle-orm";

import { BadRequestError } from "@/shared/errors/error";
import { parseCsv, parseIsoDate } from "@/shared/helpers/csv.helper";
import { logger } from "@/shared/helpers/logger.helper";

import { db } from "@/db/db";
import {
  applyUserReview,
  ensureUserLike,
  ensureUserWatchList,
  markMediaWatched,
  upsertMediaRow,
} from "@/modules/media/letterboxd/letterboxd-apply.query";
import { getSettingsTmdbApiKey } from "@/modules/settings/tmdb-key.query";
import { searchTmdbByTitle, sleep, tmdbItemToMediaInsert } from "@/modules/tmdb/tmdb-resolve.helper";
import { user } from "@/modules/user/user.schema";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const MAX_ZIP_BYTES = 50 * 1024 * 1024;

interface AggregatedFilm {
  name: string;
  year: number | null;
  /** 0–10 scale */
  score: number | null;
  comment: string | null;
  watchedAt: Date | null;
  liked: boolean;
  watchlist: boolean;
  watched: boolean;
}

function filmKey(name: string, year: number | null): string {
  return `${name.trim().toLowerCase()}|${year ?? ""}`;
}

function letterboxdRatingToScore(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(10, Math.max(0, n * 2));
}

function isIgnoredZipPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("__macosx")) return true;
  if (normalized.includes("/deleted/") || normalized.startsWith("deleted/")) return true;
  if (normalized.includes("/orphaned/") || normalized.startsWith("orphaned/")) return true;
  return false;
}

function findCsv(files: { path: string; buffer: () => Promise<Buffer> }[], suffix: string): string | null {
  const normalizedSuffix = suffix.replace(/\\/g, "/").toLowerCase();
  const match = files.find((f) => {
    const p = f.path.replace(/\\/g, "/").toLowerCase();
    if (isIgnoredZipPath(p)) return false;
    return p === normalizedSuffix || p.endsWith(`/${normalizedSuffix}`);
  });
  return match ? match.path : null;
}

async function readCsvFile(
  files: { path: string; buffer: () => Promise<Buffer> }[],
  suffix: string,
): Promise<Record<string, string>[]> {
  const path = findCsv(files, suffix);
  if (!path) return [];
  const entry = files.find((f) => f.path === path);
  if (!entry) return [];
  const buf = await entry.buffer();
  return parseCsv(buf.toString("utf8"));
}

function ensureFilm(map: Map<string, AggregatedFilm>, name: string, yearRaw: string): AggregatedFilm | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const year = yearRaw ? Number(yearRaw) : null;
  const key = filmKey(trimmed, Number.isFinite(year) ? year : null);
  let film = map.get(key);
  if (!film) {
    film = {
      name: trimmed,
      year: Number.isFinite(year as number) ? (year as number) : null,
      score: null,
      comment: null,
      watchedAt: null,
      liked: false,
      watchlist: false,
      watched: false,
    };
    map.set(key, film);
  }
  return film;
}

function mergeScore(film: AggregatedFilm, score: number | null, watchedAt: Date | null, comment?: string | null) {
  if (score != null) film.score = score;
  if (comment) film.comment = comment;
  if (watchedAt && (!film.watchedAt || watchedAt.getTime() >= film.watchedAt.getTime())) {
    film.watchedAt = watchedAt;
  }
}

function aggregateFilms(csvs: {
  ratings: Record<string, string>[];
  diary: Record<string, string>[];
  reviews: Record<string, string>[];
  likes: Record<string, string>[];
  watchlist: Record<string, string>[];
  watched: Record<string, string>[];
}): Map<string, AggregatedFilm> {
  const map = new Map<string, AggregatedFilm>();

  // ratings → diary → reviews (later wins for score/comment)
  for (const row of csvs.ratings) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    mergeScore(film, letterboxdRatingToScore(row.Rating), parseIsoDate(row.Date));
  }

  for (const row of csvs.diary) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    mergeScore(film, letterboxdRatingToScore(row.Rating), parseIsoDate(row["Watched Date"]) ?? parseIsoDate(row.Date));
    film.watched = true;
  }

  for (const row of csvs.reviews) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    const comment = (row.Review ?? "").trim() || null;
    mergeScore(
      film,
      letterboxdRatingToScore(row.Rating),
      parseIsoDate(row["Watched Date"]) ?? parseIsoDate(row.Date),
      comment,
    );
    film.watched = true;
  }

  for (const row of csvs.likes) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    film.liked = true;
  }

  for (const row of csvs.watchlist) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    film.watchlist = true;
  }

  for (const row of csvs.watched) {
    const film = ensureFilm(map, row.Name ?? "", row.Year ?? "");
    if (!film) continue;
    film.watched = true;
    const date = parseIsoDate(row.Date);
    if (date && !film.watchedAt) film.watchedAt = date;
  }

  return map;
}

export async function importLetterboxdZip(userId: string, file: File): Promise<LetterboxdSyncResponse> {
  if (
    !file.name.toLowerCase().endsWith(".zip") &&
    file.type !== "application/zip" &&
    file.type !== "application/x-zip-compressed"
  ) {
    throw new BadRequestError("Only .zip Letterboxd exports are accepted");
  }
  if (file.size > MAX_ZIP_BYTES) {
    throw new BadRequestError("Zip file is too large (max 50MB)");
  }

  const apiKey = await getSettingsTmdbApiKey();
  if (!apiKey) throw new BadRequestError("TMDB API key is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const unzipper = await import("unzipper");
  const dir = await unzipper.Open.buffer(buffer);
  const files = dir.files as { path: string; buffer: () => Promise<Buffer> }[];

  const profileRows = await readCsvFile(files, "profile.csv");
  const username = profileRows[0]?.Username?.trim();
  if (!username) {
    throw new BadRequestError("Invalid Letterboxd export: missing profile.csv Username");
  }

  await db.update(user).set({ letterboxdUsername: username.toLowerCase() }).where(eq(user.id, userId));

  const films = aggregateFilms({
    ratings: await readCsvFile(files, "ratings.csv"),
    diary: await readCsvFile(files, "diary.csv"),
    reviews: await readCsvFile(files, "reviews.csv"),
    likes: await readCsvFile(files, "likes/films.csv"),
    watchlist: await readCsvFile(files, "watchlist.csv"),
    watched: await readCsvFile(files, "watched.csv"),
  });

  const list = [...films.values()];
  logger.info("LETTERBOXD", `ZIP import for ${username}: ${list.length} unique films`);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (film) => {
        const item = await searchTmdbByTitle(film.name, film.year, "movie");
        if (!item?.id) {
          skipped++;
          return;
        }

        const mediaId = Number(item.id);
        const insert = tmdbItemToMediaInsert(item, "movie");
        await upsertMediaRow(insert);

        await applyUserReview(
          userId,
          mediaId,
          { score: film.score, comment: film.comment, watchedAt: film.watchedAt },
          "overwrite",
        );

        if (film.liked) await ensureUserLike(userId, mediaId);
        if (film.watchlist) await ensureUserWatchList(userId, mediaId);
        if (film.watched) await markMediaWatched(userId, mediaId, insert.duration);

        synced++;
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("LETTERBOXD", `ZIP batch item failed: ${result.reason}`);
        errors++;
      }
    }

    if (i + BATCH_SIZE < list.length) await sleep(BATCH_DELAY_MS);
  }

  logger.info("LETTERBOXD", `ZIP import done: ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors };
}
