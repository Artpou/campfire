import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "@/db/schema";
import type { TorrentLiveData } from "@/modules/download/download.schema";
import path from "node:path";

const MIGRATIONS_FOLDER = path.resolve(__dirname, "../db/drizzle");

export type TestDb = ReturnType<typeof createTestDb>;

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export function sampleTorrent(overrides: Partial<TorrentLiveData> = {}): TorrentLiveData {
  return {
    infoHash: "abc",
    magnetURI: "magnet:?xt=urn:btih:abc",
    announce: [],
    "announce-list": [],
    timeRemaining: 0,
    received: 0,
    downloaded: 0,
    uploaded: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0.5,
    ratio: 0,
    length: 1000,
    pieceLength: 524288,
    lastPieceLength: 0,
    numPeers: 0,
    path: "./downloads",
    ready: true,
    paused: false,
    done: false,
    name: "Test",
    created: new Date(),
    maxWebConns: 4,
    files: [],
    ...overrides,
  };
}

export function json(method: "POST" | "PATCH" | "PUT", body: unknown) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// biome-ignore lint/suspicious/noExplicitAny: test helper for untyped JSON responses
export async function bodyOf(res: Response): Promise<any> {
  return res.json();
}
