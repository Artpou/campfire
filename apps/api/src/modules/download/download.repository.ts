import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";

import { db } from "@/db/db";
import { type Download, download, type TorrentLiveData } from "@/modules/download/download.schema";
import { visibleDownloadSql } from "@/modules/download/download.sql";
import { watchProgress } from "@/modules/media/media.schema";

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
    const [row] = await db.insert(download).values(values).returning();
    if (!row) throw new NotFoundError("Download");
    return row;
  },

  update: async (id: string, set: Partial<typeof download.$inferInsert>): Promise<void> => {
    await db.update(download).set(set).where(eq(download.id, id));
  },

  /** Merge patch into existing torrent JSON (and optional top-level columns). */
  updateTorrent: async (
    id: string,
    torrentPatch: Partial<TorrentLiveData>,
    extra?: Partial<typeof download.$inferInsert>,
  ): Promise<void> => {
    const current = await downloadRepository.find(id);
    await downloadRepository.update(id, {
      ...extra,
      torrent: { ...current?.torrent, ...torrentPatch } as TorrentLiveData,
    });
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
