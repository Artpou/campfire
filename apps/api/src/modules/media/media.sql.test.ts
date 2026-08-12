import { getTableName, type SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { sqlColumn } from "@/shared/sql/base.sql";

import { media, userReviews, watchProgress } from "@/modules/media/media.schema";
import { scalarUserRelation } from "@/modules/media/media.sql";

/** Flatten drizzle SQL to a string for assertions (dialect-agnostic enough for identifiers). */
function sqlToString(chunk: SQL): string {
  const parts: string[] = [];
  const walk = (value: unknown): void => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
      return;
    }
    if (typeof value === "object" && value !== null && "queryChunks" in value) {
      for (const c of (value as SQL).queryChunks) walk(c);
      return;
    }
    if (typeof value === "object" && value !== null && "value" in value) {
      walk((value as { value: unknown }).value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
    }
  };
  walk(chunk);
  return parts.join("");
}

describe("media-sort.sql — nested subquery aliases", () => {
  it("scalarUserRelation keeps join-table qualification (not media.*)", () => {
    const fragment = scalarUserRelation(userReviews, userReviews.createdAt, media.id, {
      userId: "user-1",
    });
    const rendered = sqlToString(fragment);
    const reviews = getTableName(userReviews);

    expect(rendered).toContain(reviews);
    expect(rendered).toContain("createdAt");
    // Must not qualify join columns as the outer media table
    expect(rendered).not.toMatch(/media["']?\s*\.\s*["']?createdAt/);
    expect(rendered).not.toMatch(/media["']?\s*\.\s*["']?mediaId/);
    expect(rendered).not.toMatch(/media["']?\s*\.\s*["']?userId/);
  });

  it("sqlColumn uses the source table name", () => {
    const rendered = sqlToString(sqlColumn(watchProgress, "position"));
    expect(rendered).toContain(getTableName(watchProgress));
    expect(rendered).toContain("position");
  });
});
