import { torrentStatusEnum } from "@seedarr/contracts";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { media } from "@/modules/media/media.schema";
import { module } from "@/modules/module/module.schema";
import { user } from "@/modules/user/user.schema";

export type { TorrentStatus } from "@seedarr/contracts";
export { torrentStatusEnum };

const torrentFileSchema = z.object({
  name: z.string(),
  path: z.string(),
  length: z.number(),
  downloaded: z.number(),
  progress: z.number(),
});

/** Runtime shape for download.torrent JSON — used on write to catch corrupt merges. */
export const torrentLiveDataSchema = z.object({
  infoHash: z.string(),
  magnetURI: z.string(),
  torrentFileBlobURL: z.string().optional(),
  announce: z.array(z.string()),
  "announce-list": z.array(z.array(z.string())).optional(),
  timeRemaining: z.number(),
  received: z.number(),
  downloaded: z.number(),
  uploaded: z.number(),
  downloadSpeed: z.number(),
  uploadSpeed: z.number(),
  progress: z.number(),
  ratio: z.number(),
  length: z.number(),
  pieceLength: z.number(),
  lastPieceLength: z.number(),
  numPeers: z.number(),
  path: z.string(),
  ready: z.boolean(),
  paused: z.boolean(),
  done: z.boolean(),
  name: z.string(),
  created: z.union([z.string(), z.date()]).optional(),
  createdBy: z.string().optional(),
  comment: z.string().optional(),
  maxWebConns: z.number(),
  transferring: z.boolean().optional(),
  transferProgress: z.number().optional(),
  transferSpeed: z.number().optional(),
  skipAutoTransfer: z.boolean().optional(),
  durationSeconds: z.number().optional(),
  videoCodec: z.string().optional(),
  audioCodec: z.string().optional(),
  moovAtStart: z.boolean().optional(),
  files: z.array(torrentFileSchema),
});

export type TorrentLiveData = z.infer<typeof torrentLiveDataSchema>;

export const download = sqliteTable(
  "download",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId").references(() => media.id, { onDelete: "set null" }),

    origin: text("origin"),
    quality: text("quality"),
    language: text("language"),
    container: text("container"),

    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    size: integer("size"),

    remoteLocation: text("remote_location"),

    moduleIndexerId: text("module_indexer_id").references(() => module.id, { onDelete: "set null" }),
    moduleStorageId: text("module_storage_id").references(() => module.id, { onDelete: "set null" }),

    torrent: text("torrent", { mode: "json" }).$type<TorrentLiveData>(),

    error: text("error"),
  },
  (table) => [
    index("download_userId_idx").on(table.userId),
    index("download_mediaId_idx").on(table.mediaId),
    index("download_module_storage_id_idx").on(table.moduleStorageId),
  ],
);

export const downloadRelations = relations(download, ({ one }) => ({
  media: one(media, { fields: [download.mediaId], references: [media.id] }),
}));

// --- Drizzle-Zod derived schema ---

export const downloadSelectSchema = createSelectSchema(download);
export type Download = z.infer<typeof downloadSelectSchema>;

export interface DownloadStats {
  count: number;
  totalSize: number;
  movies: { count: number; totalSize: number };
  tv: { count: number; totalSize: number };
  downloadSpeed: number;
  uploadSpeed: number;
  activeDownloads: number;
  activeUploads: number;
  peers: number;
  storage: {
    local: StorageSpaceStats | null;
    remote: (StorageSpaceStats & { protocol: "ftp" | "webdav" }) | null;
  };
}

/** Disk visualization: capacity / occupied / Seedarr-owned bytes. */
export interface StorageSpaceStats {
  /** Bytes Seedarr downloads occupy on this storage. */
  seedarrUsed: number;
  /** Bytes occupied on the volume (null when unknown, e.g. plain FTP). */
  diskUsed: number | null;
  /** Total capacity in bytes (null when unknown). */
  diskTotal: number | null;
}
