import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { schema } from "@/db/schema";
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

export function mockUser(role: "owner" | "admin" | "member" | "viewer" = "member") {
  return {
    id: `user-test-${role}`,
    username: `test-${role}`,
    role,
    createdAt: new Date("2024-01-01"),
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
