/**
 * Production migrator for Docker.
 * Avoids drizzle-orm/libsql/migrator which uses invalid SQLITE `SERIAL` and can
 * leave tables applied without journal rows (→ "table already exists" on restart).
 */
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATIONS_TABLE = "__drizzle_migrations";
const url = process.env.DATABASE_URL || "file:./dev.db";
const migrationsFolder = path.resolve(process.cwd(), "src/db/drizzle");

function loadMigrations(folder) {
  const journal = JSON.parse(readFileSync(path.join(folder, "meta/_journal.json"), "utf8"));
  return journal.entries.map((entry) => {
    const query = readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8");
    const statements = query
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    const hash = createHash("sha256").update(query).digest("hex");
    return { tag: entry.tag, when: entry.when, hash, statements };
  });
}

function isIgnorableSchemaError(error, statement) {
  const message = String(error?.message ?? error).toLowerCase();
  if (message.includes("already exists")) return true;
  if (message.includes("duplicate column name")) return true;
  // Idempotent DROP COLUMN when a previous partial migrate already removed it
  if (statement.trim().toUpperCase().startsWith("ALTER TABLE") && message.includes("no such column")) {
    return true;
  }
  return false;
}

async function ensureMigrationsTable(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at NUMERIC NOT NULL
    )
  `);
}

async function getAppliedHashes(client) {
  const result = await client.execute(`SELECT hash FROM ${MIGRATIONS_TABLE}`);
  return new Set(result.rows.map((row) => String(row.hash)));
}

async function applyMigration(client, migration) {
  for (const statement of migration.statements) {
    try {
      await client.execute(statement);
    } catch (error) {
      if (isIgnorableSchemaError(error, statement)) {
        console.warn(`[migrate] Skipping already-applied statement in ${migration.tag}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  await client.execute({
    sql: `INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`,
    args: [migration.hash, migration.when],
  });
}

console.log(`[migrate] Applying migrations from ${migrationsFolder}`);

const client = createClient({ url });
const migrations = loadMigrations(migrationsFolder);

try {
  await ensureMigrationsTable(client);
  const applied = await getAppliedHashes(client);
  let appliedCount = 0;

  for (const migration of migrations) {
    if (applied.has(migration.hash)) continue;
    console.log(`[migrate] ${migration.tag}`);
    await applyMigration(client, migration);
    appliedCount += 1;
  }

  console.log(`[migrate] Done (${appliedCount} new, ${migrations.length} total)`);
} finally {
  client.close();
}
