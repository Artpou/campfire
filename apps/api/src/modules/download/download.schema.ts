import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "@/modules/user/user.schema";

export const torrentStatusEnum = ["queued", "downloading", "completed", "failed", "paused"] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

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
  /** Ephemeral — transfer in progress (UI progress bar). */
  transferring?: boolean;
  transferProgress?: number;
  /** Skip auto-transfer when user chose local-only at start. */
  skipAutoTransfer?: boolean;
  /** Cached ffprobe duration (seconds) — survives local delete after remote transfer. */
  durationSeconds?: number;
  /** Cached ffprobe codecs — avoid re-probing on every playback-info request. */
  videoCodec?: string;
  audioCodec?: string;
  /** Cached MP4 faststart check (moov before mdat). */
  moovAtStart?: boolean;
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

    /** Set when a remote transfer completes — null means local-only (or not yet transferred). */
    remoteLocation: text("remote_location"),

    torrent: text("torrent", { mode: "json" }).$type<TorrentLiveData>(),

    error: text("error"),
  },
  (table) => [index("download_userId_idx").on(table.userId), index("download_mediaId_idx").on(table.mediaId)],
);
