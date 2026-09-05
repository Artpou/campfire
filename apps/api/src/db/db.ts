import "./env";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { schema } from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

export const db = drizzle(client, { schema });

/** Must run once at startup — SQLite disables FK enforcement by default. */
export async function ensureDbPragmas(): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");
}
