import { and, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";

import { db } from "@/db/db";
import { download } from "@/modules/download/download.schema";
import { watchProgress } from "@/modules/media/media.schema";
import { module } from "@/modules/module/module.schema";

export async function getEnabledStorageModuleId(): Promise<string | null> {
  const row = await db.query.module.findFirst({
    where: and(eq(module.category, "storage"), eq(module.enabled, true)),
    columns: { id: true },
  });
  return row?.id ?? null;
}

async function getDisabledStorageModuleIds(): Promise<string[]> {
  const rows = await db
    .select({ id: module.id })
    .from(module)
    .where(and(eq(module.category, "storage"), eq(module.enabled, false)));
  return rows.map((row) => row.id);
}

async function hasEnabledStorageModule(): Promise<boolean> {
  return (await getEnabledStorageModuleId()) != null;
}

/** Hide remote-only downloads that belong to a disabled storage (keep torrent downloads). */
export async function visibleDownloadSql(): Promise<SQL | undefined> {
  const disabledIds = await getDisabledStorageModuleIds();
  const storageEnabled = await hasEnabledStorageModule();

  const hideDisabled = disabledIds.length > 0 ? inArray(download.moduleStorageId, disabledIds) : sql`0`;

  const hideLegacyRemote = storageEnabled
    ? sql`0`
    : sql`${download.moduleStorageId} IS NULL AND ${download.remoteLocation} IS NOT NULL`;

  return sql`NOT (
    ${download.torrent} IS NULL AND (${hideDisabled} OR ${hideLegacyRemote})
  )`;
}

export async function deleteOrphanRemoteDownloads(storageModuleId: string): Promise<number> {
  const rows = await db.query.download.findMany({
    where: and(eq(download.moduleStorageId, storageModuleId), isNull(download.torrent)),
    columns: { id: true },
  });
  if (rows.length === 0) return 0;

  const ids = rows.map((row) => row.id);
  await db.delete(watchProgress).where(inArray(watchProgress.downloadId, ids));
  await db.delete(download).where(inArray(download.id, ids));
  return ids.length;
}
