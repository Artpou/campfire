import { filenameParse } from "@ctrl/video-filename-parser";
import type { ManualSyncInput } from "@seedarr/contracts";
import { getVideoContainer, isVideoFile } from "@seedarr/shared";
import { and, eq } from "drizzle-orm";

import { BadRequestError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import { db } from "@/db/db";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { download } from "@/modules/download/download.schema";
import { media } from "@/modules/media/media.schema";
import type { TMDBItem } from "@/modules/tmdb/tmdb.types";
import { getTmdbApiKey } from "@/modules/tmdb/tmdb-key.query";
import {
  fetchTmdbById,
  fetchTmdbByImdbId,
  searchTmdbByTitle,
  sleep,
  tmdbItemToMediaInsert,
} from "@/modules/tmdb/tmdb-resolve.helper";
import { remoteStorageService } from "./remote-storage.service";

interface RemoteSyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

export interface RemoteSyncResponse {
  synced: number;
  skipped: number;
  errors: RemoteSyncError[];
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 250;

const SKIP_DIRECTORY_NAMES = new Set([
  "freebox",
  "#recycle",
  "@eadir",
  "$recycle.bin",
  "system volume information",
  "lost+found",
  "tmp",
  "temp",
]);

const TMDB_ID_REGEX = /\{tmdb-(\d+)\}/i;
const IMDB_ID_REGEX = /\{imdb-(tt\d+)\}/i;
const IMDB_BARE_REGEX = /\b(tt\d{7,})\b/;

interface SyncEntry {
  name: string;
  remoteLocation: string;
  mediaType: "movie" | "tv";
  type: "file" | "directory";
  basePath: string;
}

interface TMDBMatch {
  item: TMDBItem;
  resolvedType: "movie" | "tv";
}

// --- Helpers ---

function isSyncableDir(name: string): boolean {
  if (!name || name === "." || name === "..") return false;
  if (name.startsWith(".")) return false;
  return !SKIP_DIRECTORY_NAMES.has(name.toLowerCase());
}

function isSyncableFile(name: string): boolean {
  return isVideoFile(name);
}

function extractTmdbId(name: string): number | null {
  const match = name.match(TMDB_ID_REGEX);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractImdbId(name: string): string | null {
  const match = name.match(IMDB_ID_REGEX) || name.match(IMDB_BARE_REGEX);
  return match ? match[1] : null;
}

function parseEntry(
  name: string,
  isTv: boolean,
): {
  title: string;
  year: number | null;
  seasons: number[];
  quality: string | null;
  language: string | null;
  container: string | null;
} {
  const parsed = filenameParse(name, isTv);

  let title = parsed.title;
  if (!title && isTv) {
    title = filenameParse(name, false).title;
  }
  if (!title) {
    title = name.replace(/[._-]/g, " ").replace(/\s+/g, " ").trim();
  }

  const year = parsed.year ? Number.parseInt(parsed.year, 10) : null;
  const seasons = isTv && "seasons" in parsed ? ((parsed.seasons as number[]) ?? []) : [];
  const quality = parsed.resolution ?? null;
  const language = parsed.languages?.[0] ?? null;
  const container = getVideoContainer(name);

  return { title, year, seasons, quality, language, container };
}

function extractYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const year = Number.parseInt(dateStr.substring(0, 4), 10);
  return Number.isNaN(year) ? null : year;
}

function buildPlexFolderName(title: string, year: number | null): string {
  return year ? `${title} (${year})` : title;
}

function getTmdbTitle(item: TMDBItem, type: "movie" | "tv"): string {
  return type === "movie" ? (item.title ?? item.name ?? "") : (item.name ?? item.title ?? "");
}

async function resolveTmdbMatch(name: string, mediaType: "movie" | "tv"): Promise<TMDBMatch | null> {
  const tmdbId = extractTmdbId(name);
  if (tmdbId) {
    const item = await fetchTmdbById(tmdbId, mediaType);
    if (item) return { item, resolvedType: mediaType };
  }

  const imdbId = extractImdbId(name);
  if (imdbId) {
    const found = await fetchTmdbByImdbId(imdbId);
    if (found) return { item: found.item, resolvedType: found.type };
  }

  const { title, year } = parseEntry(name, mediaType === "tv");
  if (title) {
    const item = await searchTmdbByTitle(title, year, mediaType);
    if (item) return { item, resolvedType: mediaType };
  }

  return null;
}

// --- Entry collection ---

async function collectEntries(basePath: string, mediaType: "movie" | "tv"): Promise<SyncEntry[]> {
  const results: SyncEntry[] = [];
  try {
    const items = await remoteStorageService.listDirectories(basePath);
    const normalizedBase = basePath.replace(/\/+$/, "");
    logger.info("REMOTE_SYNC", `${mediaType} path "${basePath}": ${items.length} entries`);

    for (const item of items) {
      if (item.type === "directory" && isSyncableDir(item.name)) {
        results.push({
          name: item.name,
          remoteLocation: `${normalizedBase}/${item.name}`,
          mediaType,
          type: "directory",
          basePath: normalizedBase,
        });
      } else if (item.type === "file" && isSyncableFile(item.name)) {
        results.push({
          name: item.name,
          remoteLocation: `${normalizedBase}/${item.name}`,
          mediaType,
          type: "file",
          basePath: normalizedBase,
        });
      }
    }
  } catch (err) {
    logger.error("REMOTE_SYNC", `Failed to list ${mediaType} directory "${basePath}": ${err}`);
  }
  return results;
}

// --- File organization ---

function buildDownloadLocation(entry: SyncEntry, tmdbItem: TMDBItem, resolvedType: "movie" | "tv"): string {
  const releaseDate = resolvedType === "movie" ? tmdbItem.release_date : tmdbItem.first_air_date;
  const tmdbTitle = getTmdbTitle(tmdbItem, resolvedType);
  const year = extractYear(releaseDate);
  return `${entry.basePath}/${buildPlexFolderName(tmdbTitle, year)}`;
}

async function organizeFile(
  entry: SyncEntry,
  tmdbItem: TMDBItem,
  resolvedType: "movie" | "tv",
  seasons: number[],
): Promise<void> {
  const releaseDate = resolvedType === "movie" ? tmdbItem.release_date : tmdbItem.first_air_date;
  const tmdbTitle = getTmdbTitle(tmdbItem, resolvedType);
  const year = extractYear(releaseDate);
  const folderName = buildPlexFolderName(tmdbTitle, year);

  let targetDir: string;
  if (resolvedType === "tv") {
    const seasonNum = seasons[0] ?? 1;
    const seasonFolder = `Season ${String(seasonNum).padStart(2, "0")}`;
    targetDir = `${entry.basePath}/${folderName}/${seasonFolder}`;
  } else {
    targetDir = `${entry.basePath}/${folderName}`;
  }

  const from = entry.remoteLocation;
  const to = `${targetDir}/${entry.name}`;

  try {
    await remoteStorageService.ensureDirectory(targetDir);
    await remoteStorageService.moveFile(from, to);
    logger.info("REMOTE_SYNC", `Moved "${entry.name}" → "${to}"`);
  } catch (err) {
    logger.error("REMOTE_SYNC", `Failed to organize file "${entry.name}": ${err}`);
  }
}

// --- Main ---

export async function runRemoteSync(userId: string): Promise<RemoteSyncResponse> {
  const apiKey = await getTmdbApiKey();
  if (!apiKey) {
    throw new BadRequestError("TMDB API key is required for synchronization. Configure it in Settings > Modules.");
  }

  const { remoteStorageService } = await import("./remote-storage.service");
  if (!(await remoteStorageService.isEnabled())) {
    throw new BadRequestError("Remote storage is not configured or disabled");
  }

  const config = await remoteStorageService.getMediaPaths();

  const existingDownloads = await db.query.download.findMany({ with: { media: true } });
  const existingLocations = new Set<string>();
  const existingTitles = new Set<string>();

  for (const dl of existingDownloads) {
    if (dl.remoteLocation) existingLocations.add(dl.remoteLocation.toLowerCase());
    const m = dl.media;
    if (m) {
      existingTitles.add(m.title.toLowerCase());
      if (m.original_title) existingTitles.add(m.original_title.toLowerCase());
    }
  }

  const entries: SyncEntry[] = [];

  if (config.moviePath) {
    entries.push(...(await collectEntries(config.moviePath, "movie")));
  }
  if (config.tvPath) {
    entries.push(...(await collectEntries(config.tvPath, "tv")));
  }

  const uniqueEntries: SyncEntry[] = [];
  const seenLocations = new Set<string>();
  for (const entry of entries) {
    const key = entry.remoteLocation.toLowerCase();
    if (seenLocations.has(key)) continue;
    seenLocations.add(key);
    uniqueEntries.push(entry);
  }

  logger.info("REMOTE_SYNC", `Found ${uniqueEntries.length} entries to process (${entries.length} total before dedup)`);

  if (uniqueEntries.length === 0) {
    return { synced: 0, skipped: 0, errors: [] };
  }

  let synced = 0;
  let skipped = 0;
  const errors: RemoteSyncResponse["errors"] = [];
  const syncedMediaIds = new Set<number>();

  for (let i = 0; i < uniqueEntries.length; i += BATCH_SIZE) {
    const batch = uniqueEntries.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((entry) => processEntry(entry, userId, existingLocations, existingTitles, syncedMediaIds)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled") {
        if (result.value === "synced") synced++;
        else if (result.value === "skipped") skipped++;
        else errors.push({ name: batch[j].name, path: batch[j].remoteLocation, type: batch[j].mediaType });
      } else {
        logger.error("REMOTE_SYNC", `Error processing "${batch[j].name}": ${result.reason}`);
        errors.push({ name: batch[j].name, path: batch[j].remoteLocation, type: batch[j].mediaType });
      }
    }

    if (i + BATCH_SIZE < uniqueEntries.length) await sleep(BATCH_DELAY_MS);
  }

  ActivityLogService.log({
    userId,
    type: errors.length > 0 ? "WARNING" : "SUCCESS",
    action: "REMOTE_SYNC",
    title: `Remote sync completed: ${synced} synced, ${skipped} skipped, ${errors.length} errors`,
    metadata: { synced, skipped, errors },
  });

  logger.info("REMOTE_SYNC", `Completed: ${synced} synced, ${skipped} skipped, ${errors.length} errors`);
  return { synced, skipped, errors };
}

// --- Per-entry processing ---

async function processEntry(
  entry: SyncEntry,
  userId: string,
  existingLocations: Set<string>,
  existingTitles: Set<string>,
  syncedMediaIds: Set<number>,
): Promise<"synced" | "skipped" | "not_found"> {
  const { name, remoteLocation, mediaType, type } = entry;

  if (existingLocations.has(remoteLocation.toLowerCase())) return "skipped";

  const { title, seasons, quality, language, container } = parseEntry(name, mediaType === "tv");
  if (title && existingTitles.has(title.toLowerCase())) return "skipped";

  const match = await resolveTmdbMatch(name, mediaType);
  if (!match?.item?.id) return "not_found";

  const { item: tmdbItem, resolvedType } = match;
  const mediaInsert = tmdbItemToMediaInsert(tmdbItem, resolvedType);

  if (syncedMediaIds.has(tmdbItem.id)) {
    if (type === "file") await organizeFile(entry, tmdbItem, resolvedType, seasons);
    return "skipped";
  }

  const existingDls = await db.query.download.findMany({
    where: eq(download.mediaId, tmdbItem.id),
  });

  if (existingDls.length > 0) {
    const needsUpdate = existingDls.some((dl) => !dl.remoteLocation);
    if (needsUpdate) {
      const targetLocation = type === "file" ? buildDownloadLocation(entry, tmdbItem, resolvedType) : remoteLocation;
      for (const dl of existingDls) {
        if (!dl.remoteLocation) {
          await db.update(download).set({ remoteLocation: targetLocation }).where(eq(download.id, dl.id));
        }
      }
      await db.insert(media).values(mediaInsert).onConflictDoUpdate({ target: media.id, set: mediaInsert });
    }

    if (type === "file") await organizeFile(entry, tmdbItem, resolvedType, seasons);

    syncedMediaIds.add(tmdbItem.id);
    existingTitles.add(mediaInsert.title.toLowerCase());
    if (mediaInsert.original_title) existingTitles.add(mediaInsert.original_title.toLowerCase());
    return needsUpdate ? "synced" : "skipped";
  }

  if (type === "file") await organizeFile(entry, tmdbItem, resolvedType, seasons);

  const downloadLocation = type === "file" ? buildDownloadLocation(entry, tmdbItem, resolvedType) : remoteLocation;

  await db.insert(media).values(mediaInsert).onConflictDoUpdate({ target: media.id, set: mediaInsert });

  let remoteSize: number | null = null;
  try {
    const files = await remoteStorageService.listFiles(downloadLocation);
    remoteSize = files.reduce((sum, f) => sum + f.length, 0) || null;
  } catch {
    /* size remains null */
  }

  await db.insert(download).values({
    userId,
    mediaId: tmdbItem.id,
    origin: "remote-sync",
    quality,
    language,
    container,
    remoteLocation: downloadLocation,
    size: remoteSize,
    torrent: null,
  });

  syncedMediaIds.add(tmdbItem.id);
  existingLocations.add(downloadLocation.toLowerCase());
  existingTitles.add(mediaInsert.title.toLowerCase());
  if (mediaInsert.original_title) existingTitles.add(mediaInsert.original_title.toLowerCase());

  return "synced";
}

export async function runManualSync(userId: string, input: ManualSyncInput): Promise<{ success: true }> {
  const apiKey = await getTmdbApiKey();
  if (!apiKey) throw new BadRequestError("TMDB API key is required");

  const tmdbItem = await fetchTmdbById(input.mediaId, input.type);
  if (!tmdbItem) throw new BadRequestError("Could not find media on TMDB");

  const mediaInsert = tmdbItemToMediaInsert(tmdbItem, input.type);
  await db.insert(media).values(mediaInsert).onConflictDoUpdate({ target: media.id, set: mediaInsert });

  const existing = await db.query.download.findFirst({
    where: and(eq(download.mediaId, input.mediaId), eq(download.remoteLocation, input.remotePath)),
  });

  if (!existing) {
    let remoteSize: number | null = null;
    try {
      const files = await remoteStorageService.listFiles(input.remotePath);
      remoteSize = files.reduce((sum, f) => sum + f.length, 0) || null;
    } catch {
      /* size remains null */
    }

    const fileName = input.remotePath.split("/").pop() ?? input.remotePath;
    const { quality, language, container } = parseEntry(fileName, input.type === "tv");

    await db.insert(download).values({
      userId,
      mediaId: input.mediaId,
      origin: "remote-sync",
      quality,
      language,
      container,
      remoteLocation: input.remotePath,
      size: remoteSize,
      torrent: null,
    });
  }

  ActivityLogService.log({
    userId,
    type: "SUCCESS",
    action: "REMOTE_SYNC",
    title: `Manual sync: ${mediaInsert.title}`,
    metadata: { mediaId: input.mediaId, remotePath: input.remotePath },
  });

  return { success: true };
}
