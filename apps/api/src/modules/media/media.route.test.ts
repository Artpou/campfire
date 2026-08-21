import { beforeEach, describe, expect, it, vi } from "vitest";

import { media } from "@/modules/media/media.schema";
import { bodyOf, createAuthGuardMock, createTestDb, json, seedTestUser, testDbRef } from "@/tests/test.helper";

const { fakeUser } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  return { fakeUser };
});

vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(fakeUser),
}));

const { mediaRoutes } = await import("./media.route");

const SAMPLE_MEDIA = { id: 500, type: "movie" as const, title: "Interstellar", imdbId: "tt0000001" };

describe("Media Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
  });

  describe("POST / - upsert", () => {
    it("creates a new media entry", async () => {
      const res = await mediaRoutes.request("/", json("POST", SAMPLE_MEDIA));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body).toMatchObject({ id: 500, title: "Interstellar", liked: false, inWatchList: false });
    });

    it("returns 400 on invalid body", async () => {
      const res = await mediaRoutes.request("/", json("POST", {}));
      expect(res.status).toBe(400);
    });
  });

  describe("with existing media (id: 500)", () => {
    beforeEach(() => {
      testDbRef.current.insert(media).values(SAMPLE_MEDIA).run();
    });

    it("GET /:id - returns media with status", async () => {
      const body = await bodyOf(await mediaRoutes.request("/500"));
      expect(body).toMatchObject({ id: 500, title: "Interstellar", liked: false, inWatchList: false });
    });

    it("GET /:id - returns 404 for unknown id", async () => {
      const res = await mediaRoutes.request("/99999");
      expect(res.status).toBe(404);
    });

    it("POST /like - toggles like on then off", async () => {
      let body = await bodyOf(await mediaRoutes.request("/like", json("POST", SAMPLE_MEDIA)));
      expect(body.liked).toBe(true);

      body = await bodyOf(await mediaRoutes.request("/like", json("POST", SAMPLE_MEDIA)));
      expect(body.liked).toBe(false);
    });

    it("POST /watchlist - adds to watchlist", async () => {
      const body = await bodyOf(await mediaRoutes.request("/watchlist", json("POST", SAMPLE_MEDIA)));
      expect(body.inWatchList).toBe(true);
    });
  });

  describe("GET / - list with filters and sorting", () => {
    beforeEach(() => {
      // Données insérées volontairement hors ordre alphabétique
      testDbRef.current
        .insert(media)
        .values([
          { id: 1, type: "movie", title: "Zebra", imdbId: "tt0000001" },
          { id: 2, type: "tv", title: "Alpha", imdbId: "tt0000002" },
          { id: 3, type: "movie", title: "Beta", imdbId: "tt0000003" },
        ])
        .run();
    });

    it("returns paginated results", async () => {
      const body = await bodyOf(await mediaRoutes.request("/?page=1&limit=10"));
      expect(body.results).toHaveLength(3);
      expect(body.page).toBe(1);
    });

    it("filters by type", async () => {
      const body = await bodyOf(await mediaRoutes.request("/?type=movie&page=1&limit=10"));
      expect(body.results).toHaveLength(2);
      expect(body.results.every((r: { type: string }) => r.type === "movie")).toBe(true);
    });

    it("filters by like", async () => {
      await mediaRoutes.request("/like", json("POST", { id: 1, type: "movie", title: "Zebra", imdbId: "tt0000001" }));
      const body = await bodyOf(await mediaRoutes.request("/?filter=like&page=1&limit=10"));
      expect(body.results).toHaveLength(1);
      expect(body.results[0].id).toBe(1);
    });

    it("filter=calendar with activity orderBy succeeds", async () => {
      await mediaRoutes.request("/like", json("POST", { id: 1, type: "movie", title: "Zebra", imdbId: "tt0000001" }));
      await mediaRoutes.request("/like", json("POST", { id: 3, type: "movie", title: "Beta", imdbId: "tt0000003" }));

      const res = await mediaRoutes.request("/?filter=calendar&page=1&limit=100&userId=user-1");
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.results.length).toBeGreaterThanOrEqual(2);
      expect(body.results.every((r: { id: number }) => [1, 3].includes(r.id))).toBe(true);
    });

    describe("Sorting", () => {
      it("sorts by title ascending (ASC)", async () => {
        const body = await bodyOf(await mediaRoutes.request("/?sortBy=title&sortOrder=asc&page=1&limit=10"));
        const titles = body.results.map((r: { title: string }) => r.title);
        expect(titles).toEqual(["Alpha", "Beta", "Zebra"]);
      });

      it("sorts by title descending (DESC)", async () => {
        const body = await bodyOf(await mediaRoutes.request("/?sortBy=title&sortOrder=desc&page=1&limit=10"));
        const titles = body.results.map((r: { title: string }) => r.title);
        expect(titles).toEqual(["Zebra", "Beta", "Alpha"]);
      });

      it("maintains correct sort order across paginated pages", async () => {
        const page1 = await bodyOf(await mediaRoutes.request("/?sortBy=title&sortOrder=asc&page=1&limit=2"));
        expect(page1.results.map((r: { title: string }) => r.title)).toEqual(["Alpha", "Beta"]);
        expect(page1.hasMore).toBe(true);

        const page2 = await bodyOf(await mediaRoutes.request("/?sortBy=title&sortOrder=asc&page=2&limit=2"));
        expect(page2.results.map((r: { title: string }) => r.title)).toEqual(["Zebra"]);
        expect(page2.hasMore).toBe(false);
      });
    });
  });
});
