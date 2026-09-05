import { db } from "@/db/db";
import { module } from "./module.schema";

/** Ensure locked system modules exist. Safe under concurrent callers (listPage Promise.all). */
export async function ensureSystemModules(): Promise<void> {
  await db
    .insert(module)
    .values({
      id: "tmdb-default",
      type: "tmdb",
      category: "system",
      enabled: true,
      config: {},
    })
    .onConflictDoNothing();

  await db
    .insert(module)
    .values({
      id: "subdl-default",
      type: "subdl",
      category: "system",
      enabled: true,
      config: {},
    })
    .onConflictDoNothing();
}
