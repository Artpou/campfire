import { beforeEach, describe, expect, it, vi } from "vitest";

import { media } from "@/modules/media/media.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "testuser", role: "member" as const, createdAt: new Date("2024-01-01") };
  const testDbRef = { current: null as TestDb | null };
  return { fakeUser, testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));
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
      testDbRef.current?.insert(media).values(SAMPLE_MEDIA).run();
    });

    it("GET /:id - returns media with status", async () => {
      const body = await bodyOf(await mediaRoutes.request("/500"));
      expect(body).toMatchObject({ id: 500, title: "Interstellar", liked: false, inWatchList: false });
    });

    it("GET /:id - returns 404 for unknown id", async () => {
      const res = await mediaRoutes.request("/99999");
      expect(res.status).toBe(404);
    });

    it("POST /:id/like - toggles like on then off", async () => {
      let body = await bodyOf(await mediaRoutes.request("/500/like", json("POST", SAMPLE_MEDIA)));
      expect(body.liked).toBe(true);

      body = await bodyOf(await mediaRoutes.request("/500/like", json("POST", SAMPLE_MEDIA)));
      expect(body.liked).toBe(false);
    });

    it("POST /:id/watchlist - adds to watchlist", async () => {
      const body = await bodyOf(await mediaRoutes.request("/500/watchlist", json("POST", SAMPLE_MEDIA)));
      expect(body.inWatchList).toBe(true);
    });
  });

  describe("GET / - list with filters", () => {
    beforeEach(() => {
      testDbRef.current
        ?.insert(media)
        .values([
          { id: 1, type: "movie", title: "Movie 1", imdbId: "tt0000001" },
          { id: 2, type: "tv", title: "TV 1", imdbId: "tt0000002" },
        ])
        .run();
    });

    it("returns paginated results", async () => {
      const body = await bodyOf(await mediaRoutes.request("/?page=1&limit=10"));
      expect(body.results).toHaveLength(2);
      expect(body.page).toBe(1);
    });

    it("filters by type", async () => {
      const body = await bodyOf(await mediaRoutes.request("/?type=movie&page=1&limit=10"));
      expect(body.results).toHaveLength(1);
      expect(body.results[0].type).toBe("movie");
    });

    it("filters by like", async () => {
      await mediaRoutes.request(
        "/1/like",
        json("POST", { id: 1, type: "movie", title: "Movie 1", imdbId: "tt0000001" }),
      );
      const body = await bodyOf(await mediaRoutes.request("/?filter=like&page=1&limit=10"));
      expect(body.results).toHaveLength(1);
      expect(body.results[0].id).toBe(1);
    });
  });
});
