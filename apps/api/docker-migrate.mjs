import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";

const url = process.env.DATABASE_URL || "file:./dev.db";
const migrationsFolder = path.resolve(process.cwd(), "src/db/drizzle");

console.log(`[migrate] Applying migrations from ${migrationsFolder}`);

const client = createClient({ url });
const db = drizzle(client);

await migrate(db, { migrationsFolder });

console.log("[migrate] Done");
client.close();
