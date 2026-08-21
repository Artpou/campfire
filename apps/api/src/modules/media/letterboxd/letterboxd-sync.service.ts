import type { LetterboxdSyncResponse } from "@seedarr/contracts";
import { XMLParser } from "fast-xml-parser";

import { BadRequestError } from "@/shared/errors/error";
import { parseIsoDate } from "@/shared/helpers/csv.helper";
import { logger } from "@/shared/helpers/logger.helper";

import { mediaRepository } from "@/modules/media/media.repository";
import { mediaRelationsRepository } from "@/modules/media/media-relations.repository";
import { getTmdbApiKey } from "@/modules/tmdb/tmdb-key.query";
import { fetchTmdbById, sleep, tmdbItemToMediaInsert } from "@/modules/tmdb/tmdb-resolve.helper";
import { userRepository } from "@/modules/user/user.repository";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

interface LetterboxdRssEntry {
  tmdbId: number;
  type: "movie" | "tv";
  /** 0–10 scale */
  score: number | null;
  liked: boolean;
  comment: string | null;
  watchedAt: Date | null;
}

function extractComment(description: string | undefined): string | null {
  if (!description) return null;
  const withoutImg = description.replace(/<img[^>]*>/gi, "");
  const texts = [...withoutImg.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
  const meaningful = texts.find((t) => !/^Watched on /i.test(t));
  return meaningful || null;
}

function parseRss(xml: string): LetterboxdRssEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) return [];

  const rawItems = channel.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  const entries: LetterboxdRssEntry[] = [];
  for (const item of items) {
    const movieId = item.movieId != null ? Number(item.movieId) : NaN;
    const tvId = item.tvId != null ? Number(item.tvId) : NaN;
    let tmdbId: number;
    let type: "movie" | "tv";
    if (Number.isFinite(movieId) && movieId > 0) {
      tmdbId = movieId;
      type = "movie";
    } else if (Number.isFinite(tvId) && tvId > 0) {
      tmdbId = tvId;
      type = "tv";
    } else {
      continue;
    }

    const memberRating = item.memberRating != null ? Number(item.memberRating) : null;
    const score =
      memberRating != null && Number.isFinite(memberRating) ? Math.min(10, Math.max(0, memberRating * 2)) : null;

    entries.push({
      tmdbId,
      type,
      score,
      liked: String(item.memberLike ?? "").toLowerCase() === "yes",
      comment: extractComment(typeof item.description === "string" ? item.description : undefined),
      watchedAt: parseIsoDate(typeof item.watchedDate === "string" ? item.watchedDate : undefined),
    });
  }

  // Prefer first occurrence per media (RSS is newest-first)
  const seen = new Set<number>();
  return entries.filter((e) => {
    if (seen.has(e.tmdbId)) return false;
    seen.add(e.tmdbId);
    return true;
  });
}

async function applyEntry(userId: string, entry: LetterboxdRssEntry): Promise<void> {
  await mediaRelationsRepository.applyUserReview(
    userId,
    entry.tmdbId,
    { score: entry.score, comment: entry.comment, watchedAt: entry.watchedAt },
    "freshest",
  );
  if (entry.liked) await mediaRelationsRepository.ensureUserLike(userId, entry.tmdbId);
}

export async function syncLetterboxdDiary(userId: string): Promise<LetterboxdSyncResponse> {
  const username = (await userRepository.getLetterboxdUsername(userId))?.trim();
  if (!username) throw new BadRequestError("Import your Letterboxd export first");

  const apiKey = await getTmdbApiKey();
  if (!apiKey) throw new BadRequestError("TMDB API key is required");

  const rssUrl = `https://letterboxd.com/${username.toLowerCase()}/rss/`;
  logger.info("LETTERBOXD", `Fetching diary RSS for ${username}`);

  const response = await fetch(rssUrl, {
    headers: { "User-Agent": "Seedarr/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new BadRequestError(`Could not fetch Letterboxd RSS (${response.status}). Check the username.`);
  }

  const xml = await response.text();
  const entries = parseRss(xml);
  if (entries.length === 0) {
    return { synced: 0, skipped: 0, errors: 0 };
  }

  const existingRows = await mediaRepository.findManyByIds(entries.map((e) => e.tmdbId));
  const existingMap = new Map(existingRows.map((r) => [r.id, r]));

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  const toFetch = entries.filter((e) => !existingMap.has(e.tmdbId));
  const alreadyInDb = entries.filter((e) => existingMap.has(e.tmdbId));
  const needsMetadataRefresh = alreadyInDb.filter((e) => {
    const row = existingMap.get(e.tmdbId);
    return row && (!row.duration || !row.categories);
  });

  for (const entry of alreadyInDb) {
    try {
      await applyEntry(userId, entry);
      synced++;
    } catch (error) {
      logger.error("LETTERBOXD", `Failed applying existing ${entry.tmdbId}: ${error}`);
      errors++;
    }
  }

  for (let i = 0; i < needsMetadataRefresh.length; i += BATCH_SIZE) {
    const batch = needsMetadataRefresh.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (entry) => {
        const item = await fetchTmdbById(entry.tmdbId, entry.type);
        if (!item?.id) return;
        await mediaRepository.upsert(tmdbItemToMediaInsert(item, entry.type));
      }),
    );
    if (i + BATCH_SIZE < needsMetadataRefresh.length) await sleep(BATCH_DELAY_MS);
  }

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const item = await fetchTmdbById(entry.tmdbId, entry.type);
        if (!item?.id) {
          skipped++;
          return;
        }
        await mediaRepository.upsert(tmdbItemToMediaInsert(item, entry.type));
        await applyEntry(userId, entry);
        synced++;
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error("LETTERBOXD", `Batch item failed: ${result.reason}`);
        errors++;
      }
    }

    if (i + BATCH_SIZE < toFetch.length) await sleep(BATCH_DELAY_MS);
  }

  logger.info("LETTERBOXD", `RSS sync done: ${synced} synced, ${skipped} skipped, ${errors} errors`);
  return { synced, skipped, errors };
}
