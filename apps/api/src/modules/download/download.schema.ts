import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "@/modules/user/user.schema";

export const torrentStatusEnum = ["queued", "downloading", "completed", "failed", "paused"] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

export const streamTypeEnum = ["TORRENT", "DIRECT_URL"] as const;
export type StreamType = (typeof streamTypeEnum)[number];

export interface DirectUrlData {
  infoHash?: string;
  title: string;
  tracker: string;
  size: number;
}

export interface TorrentLiveData {
  infoHash: string;
  magnetURI: string;
  torrentFileBlobURL?: string;
  announce: string[];
  "announce-list"?: string[][];
  timeRemaining: number;
  received: number;
  downloaded: number;
  uploaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  ratio: number;
  length: number;
  pieceLength: number;
  lastPieceLength: number;
  numPeers: number;
  path: string;
  ready: boolean;
  paused: boolean;
  done: boolean;
  name: string;
  created?: Date | string;
  createdBy?: string;
  comment?: string;
  maxWebConns: number;
  files: {
    name: string;
    path: string;
    length: number;
    downloaded: number;
    progress: number;
  }[];
}

export const download = sqliteTable(
  "download",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaId: integer("mediaId"),

    origin: text("origin"),
    quality: text("quality"),
    language: text("language"),

    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),

    streamType: text("stream_type", { enum: streamTypeEnum }).notNull().default("TORRENT"),
    indexerManagerId: text("indexer_manager_id"),

    torrent: text("torrent", { mode: "json" }).$type<TorrentLiveData>(),

    error: text("error"),
  },
  (table) => [index("download_userId_idx").on(table.userId)],
);
