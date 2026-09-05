import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import { db } from "@/db/db";
import {
  type Download,
  download,
  type TorrentLiveData,
  torrentLiveDataSchema,
} from "@/modules/download/download.schema";
import { visibleDownloadSql } from "@/modules/download/download.sql";
import { watchProgress } from "@/modules/media/media.schema";

/** Per-download serialization for torrent JSON merges (avoids lost updates). */
const torrentUpdateChains = new Map<string, Promise<void>>();

function parseTorrentLiveData(value: unknown, context: string): TorrentLiveData | null {
  const parsed = torrentLiveDataSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  logger.error("DOWNLOAD", `Invalid torrent JSON (${context}): ${parsed.error.message}`);
  return null;
}

export const downloadRepository = {
  find: async (id: string): Promise<Download | undefined> => {
    return (await db.query.download.findFirst({ where: eq(download.id, id) })) ?? undefined;
  },

  get: async (id: string): Promise<Download> => {
    const row = await downloadRepository.find(id);
    if (!row) throw new NotFoundError("Download");
    return row;
  },

  exists: async (id: string): Promise<boolean> => {
    const row = await db.query.download.findFirst({ where: eq(download.id, id), columns: { id: true } });
    return row != null;
  },

  listAll: async (): Promise<Download[]> => {
    return db.select().from(download);
  },

  findManyVisible: async (options?: { ids?: string[]; limit?: number; offset?: number }): Promise<Download[]> => {
    const visibility = await visibleDownloadSql();
    const where = options?.ids?.length ? and(inArray(download.id, options.ids), visibility) : visibility;
    return db.query.download.findMany({
      where,
      orderBy: desc(download.createdAt),
      limit: options?.limit,
      offset: options?.offset,
    });
  },

  countVisible: async (): Promise<number> => {
    const visibility = await visibleDownloadSql();
    const [row] = await db.select({ count: count() }).from(download).where(visibility);
    return row?.count ?? 0;
  },

  findByMediaIdVisible: async (mediaId: number): Promise<Download[]> => {
    const visibility = await visibleDownloadSql();
    return db.query.download.findMany({
      where: and(eq(download.mediaId, mediaId), visibility),
      orderBy: desc(download.createdAt),
    });
  },

  findByMediaId: async (mediaId: number): Promise<Download[]> => {
    return db.query.download.findMany({
      where: eq(download.mediaId, mediaId),
    });
  },

  findByInfoHash: async (infoHash: string): Promise<Download | undefined> => {
    if (!infoHash) return undefined;
    const normalized = infoHash.toLowerCase();
    return (
      (await db.query.download.findFirst({
        where: sql`lower(json_extract(${download.torrent}, '$.infoHash')) = ${normalized}`,
      })) ?? undefined
    );
  },

  findManyWithMedia: async () => {
    return db.query.download.findMany({
      with: { media: { columns: { type: true, title: true, original_title: true } } },
    });
  },

  findManyVisibleWithMedia: async () => {
    const visibility = await visibleDownloadSql();
    return db.query.download.findMany({
      where: visibility,
      with: { media: { columns: { type: true } } },
    });
  },

  findByIds: async (ids: string[], columns?: { id: true; userId: true }) => {
    return db.query.download.findMany({
      where: inArray(download.id, ids),
      columns: columns ?? undefined,
    });
  },

  findByMediaIdAndRemoteLocations: async (mediaId: number, locations: string[]): Promise<Download | undefined> => {
    if (locations.length === 0) return undefined;
    return (
      (await db.query.download.findFirst({
        where: and(
          eq(download.mediaId, mediaId),
          or(...locations.map((location) => eq(download.remoteLocation, location))),
        ),
      })) ?? undefined
    );
  },

  findRemoteOrphanIds: async (storageModuleId: string): Promise<string[]> => {
    const rows = await db.query.download.findMany({
      where: and(eq(download.moduleStorageId, storageModuleId), isNull(download.torrent)),
      columns: { id: true },
    });
    return rows.map((row) => row.id);
  },

  insert: async (values: typeof download.$inferInsert): Promise<Download> => {
    if (values.torrent != null) {
      const torrent = parseTorrentLiveData(values.torrent, "insert");
      if (!torrent) throw new BadRequestError("Invalid torrent metadata");
      values = { ...values, torrent };
    }
    const [row] = await db.insert(download).values(values).returning();
    if (!row) throw new NotFoundError("Download");
    return row;
  },

  update: async (id: string, set: Partial<typeof download.$inferInsert>): Promise<void> => {
    if (set.torrent != null) {
      const torrent = parseTorrentLiveData(set.torrent, `update:${id}`);
      if (!torrent) return;
      set = { ...set, torrent };
    }
    await db.update(download).set(set).where(eq(download.id, id));
  },

  /**
   * Merge patch into torrent JSON (and optional top-level columns).
   * Serialized per downloadId so concurrent writers cannot last-write-wins.
   */
  updateTorrent: async (
    id: string,
    torrentPatch: Partial<TorrentLiveData> | ((current: Download | undefined) => Partial<TorrentLiveData>),
    extra?:
      | Partial<typeof download.$inferInsert>
      | ((current: Download | undefined) => Partial<typeof download.$inferInsert>),
  ): Promise<void> => {
    const run = async (): Promise<void> => {
      const current = await downloadRepository.find(id);
      const patch = typeof torrentPatch === "function" ? torrentPatch(current) : torrentPatch;
      const extraSet = typeof extra === "function" ? extra(current) : extra;
      const torrent = parseTorrentLiveData({ ...current?.torrent, ...patch }, `updateTorrent:${id}`);
      if (!torrent) return;
      await downloadRepository.update(id, {
        ...extraSet,
        torrent,
      });
    };

    const prev = torrentUpdateChains.get(id) ?? Promise.resolve();
    const next = prev.then(run, run);
    torrentUpdateChains.set(id, next);
    try {
      await next;
    } finally {
      if (torrentUpdateChains.get(id) === next) torrentUpdateChains.delete(id);
    }
  },

  deleteByIds: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    await db.delete(download).where(inArray(download.id, ids));
  },

  deleteWithProgress: async (id: string): Promise<void> => {
    await db.delete(watchProgress).where(eq(watchProgress.downloadId, id));
    await db.delete(download).where(eq(download.id, id));
  },

  deleteRemoteOrphans: async (storageModuleId: string): Promise<number> => {
    const ids = await downloadRepository.findRemoteOrphanIds(storageModuleId);
    if (ids.length === 0) return 0;
    await db.delete(watchProgress).where(inArray(watchProgress.downloadId, ids));
    await downloadRepository.deleteByIds(ids);
    return ids.length;
  },
};
