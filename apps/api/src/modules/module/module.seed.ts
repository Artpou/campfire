import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { module } from "./module.schema";

/** Ensure locked system modules exist. Safe to call on every list/get. */
export async function ensureSystemModules(): Promise<void> {
  const existing = await db.select({ type: module.type }).from(module).where(eq(module.category, "system"));
  const types = new Set(existing.map((r) => r.type));

  if (!types.has("tmdb")) {
    await db.insert(module).values({
      id: "tmdb-default",
      type: "tmdb",
      category: "system",
      enabled: true,
      config: {},
    });
  }

  if (!types.has("subdl")) {
    await db.insert(module).values({
      id: "subdl-default",
      type: "subdl",
      category: "system",
      enabled: true,
      config: {},
    });
  }
}
