import { describe, expect, it } from "vitest";

import { listPage, pageBounds, paginate, toPaginate } from "./pagination.helper";

describe("pageBounds", () => {
  it("defaults to page 1 / limit 20", () => {
    expect(pageBounds()).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("computes offset from page and limit", () => {
    expect(pageBounds({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10, offset: 20 });
  });
});

describe("paginate (limit+1 peek)", () => {
  it("returns limit+1 for hasMore detection", () => {
    expect(paginate({ page: 2, limit: 20 })).toEqual({ offset: 20, limit: 21 });
  });
});

describe("toPaginate", () => {
  it("slices peek row and sets hasMore", () => {
    const items = [1, 2, 3, 4];
    expect(toPaginate(items, { page: 1, limit: 3 })).toEqual({
      results: [1, 2, 3],
      page: 1,
      hasMore: true,
    });
  });
});

describe("listPage", () => {
  it("fetches exact limit and derives hasMore from total", async () => {
    const page = await listPage(
      { page: 2, limit: 2 },
      async ({ limit, offset }) => {
        expect(limit).toBe(2);
        expect(offset).toBe(2);
        return ["c", "d"];
      },
      async () => 5,
    );

    expect(page).toEqual({
      results: ["c", "d"],
      page: 2,
      total: 5,
      hasMore: true,
    });
  });

  it("sets hasMore false on last page", async () => {
    const page = await listPage(
      { page: 3, limit: 2 },
      async () => ["e"],
      async () => 5,
    );
    expect(page.hasMore).toBe(false);
    expect(page.total).toBe(5);
  });
});
