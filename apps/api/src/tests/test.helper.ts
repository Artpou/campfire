import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "@/db/schema";
import path from "node:path";

const MIGRATIONS_FOLDER = path.resolve(__dirname, "../db/drizzle");

export type TestDb = ReturnType<typeof createTestDb>;

function ensureDownloadTable(sqlite: Database.Database): void {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;

  if (tables.some((table) => table.name === "download")) return;

  if (tables.some((table) => table.name === "torrentDownload")) {
    sqlite.exec(`
      CREATE TABLE download (
        id text PRIMARY KEY NOT NULL,
        userId text NOT NULL,
        mediaId integer,
        origin text,
        quality text,
        language text,
        createdAt integer NOT NULL,
        torrent text,
        error text,
        FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
      );

      INSERT INTO download (id, userId, mediaId, origin, quality, language, createdAt, torrent, error)
      SELECT id, userId, mediaId, origin, quality, language, createdAt, NULL, error
      FROM torrentDownload;

      DROP TABLE torrentDownload;
    `);
    return;
  }

  sqlite.exec(`
    CREATE TABLE download (
      id text PRIMARY KEY NOT NULL,
      userId text NOT NULL,
      mediaId integer,
      origin text,
      quality text,
      language text,
      createdAt integer NOT NULL,
      torrent text,
      error text,
      FOREIGN KEY (userId) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
    );
  `);
}

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  ensureDownloadTable(sqlite);
  return db;
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
