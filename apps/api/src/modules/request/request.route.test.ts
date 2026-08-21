import { beforeEach, describe, expect, it, vi } from "vitest";

import { media } from "@/modules/media/media.schema";
import type { UserRole } from "@/modules/user/user.schema";
import {
  bodyOf,
  createAuthGuardMock,
  createTestDb,
  json,
  seedTestUser,
  type TestDb,
  testDbRef,
} from "@/tests/test.helper";
import { mediaRequest } from "./request.schema";

const { fakeUser } = vi.hoisted(() => ({
  fakeUser: {
    id: "user-1",
    username: "member",
    role: "member" as UserRole,
    createdAt: new Date("2024-01-01"),
  },
}));

vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(fakeUser),
}));

const { requestRoutes } = await import("./request.route");

const SAMPLE_MEDIA = { id: 42, type: "movie" as const, title: "Dune", imdbId: "tt1160419" };

function seedMedia(db: TestDb) {
  db.insert(media).values(SAMPLE_MEDIA).run();
}

function seedRequest(db: TestDb, overrides: Partial<typeof mediaRequest.$inferInsert> = {}) {
  db.insert(mediaRequest)
    .values({
      id: "req-1",
      userId: fakeUser.id,
      mediaId: SAMPLE_MEDIA.id,
      status: "pending",
      dismissed: false,
      createdAt: new Date(),
      ...overrides,
    })
    .run();
}

describe("Request Routes", () => {
  beforeEach(() => {
    fakeUser.id = "user-1";
    fakeUser.role = "member";
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
    seedMedia(testDbRef.current);
  });

  describe("POST /", () => {
    it("creates a pending request", async () => {
      const res = await requestRoutes.request("/", json("POST", SAMPLE_MEDIA));
      expect(res.status).toBe(201);
      const body = await bodyOf(res);
      expect(body).toMatchObject({
        userId: "user-1",
        mediaId: 42,
        status: "pending",
        media: { title: "Dune" },
      });
    });

    it("returns 409 when a pending request already exists", async () => {
      seedRequest(testDbRef.current);
      const res = await requestRoutes.request("/", json("POST", SAMPLE_MEDIA));
      expect(res.status).toBe(409);
    });

    it("reopens a cancelled request as pending", async () => {
      seedRequest(testDbRef.current, { status: "cancelled", dismissed: true });
      const res = await requestRoutes.request("/", json("POST", SAMPLE_MEDIA));
      expect(res.status).toBe(201);
      const body = await bodyOf(res);
      expect(body.status).toBe("pending");
      expect(body.dismissed).toBe(false);
    });

    it("upserts media when missing", async () => {
      const res = await requestRoutes.request(
        "/",
        json("POST", { id: 99, type: "tv", title: "New Show", imdbId: "tt0000099" }),
      );
      expect(res.status).toBe(201);
      const body = await bodyOf(res);
      expect(body.mediaId).toBe(99);
      expect(body.media.title).toBe("New Show");
    });
  });

  describe("GET /mine", () => {
    it("lists only the current user's requests", async () => {
      seedTestUser(testDbRef.current, {
        id: "user-2",
        username: "other",
        role: "member",
        createdAt: new Date(),
      });
      seedRequest(testDbRef.current);
      seedRequest(testDbRef.current, { id: "req-2", userId: "user-2" });

      const body = await bodyOf(await requestRoutes.request("/mine"));
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe("req-1");
    });
  });

  describe("GET /user/:id", () => {
    it("allows a user to list their own requests", async () => {
      seedRequest(testDbRef.current);
      const body = await bodyOf(await requestRoutes.request("/user/user-1"));
      expect(body).toHaveLength(1);
    });

    it("forbids members from listing another user's requests", async () => {
      const res = await requestRoutes.request("/user/user-2");
      expect(res.status).toBe(403);
    });

    it("allows admins to list any user's requests", async () => {
      fakeUser.role = "admin";
      seedTestUser(testDbRef.current, {
        id: "user-2",
        username: "other",
        role: "member",
        createdAt: new Date(),
      });
      seedRequest(testDbRef.current, { id: "req-2", userId: "user-2" });

      const body = await bodyOf(await requestRoutes.request("/user/user-2"));
      expect(body).toHaveLength(1);
      expect(body[0].userId).toBe("user-2");
    });
  });

  describe("GET / (admin)", () => {
    it("returns 403 for members", async () => {
      expect((await requestRoutes.request("/")).status).toBe(403);
    });

    it("lists all requests for admins with status filter", async () => {
      fakeUser.role = "admin";
      testDbRef.current.insert(media).values({ id: 43, type: "movie", title: "Other", imdbId: "tt0000043" }).run();
      seedRequest(testDbRef.current);
      seedRequest(testDbRef.current, { id: "req-2", mediaId: 43, status: "validated" });

      const pending = await bodyOf(await requestRoutes.request("/?status=pending&page=1&limit=10"));
      expect(pending.results).toHaveLength(1);
      expect(pending.results[0].status).toBe("pending");

      const all = await bodyOf(await requestRoutes.request("/?page=1&limit=10"));
      expect(all.results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("admin cancel / validate", () => {
    beforeEach(() => {
      fakeUser.role = "admin";
      seedRequest(testDbRef.current);
    });

    it("cancels a request", async () => {
      const res = await requestRoutes.request("/req-1/cancel", { method: "PATCH" });
      expect(res.status).toBe(200);
      const mine = await bodyOf(await requestRoutes.request("/mine"));
      expect(mine[0].status).toBe("cancelled");
    });

    it("validates a request", async () => {
      const res = await requestRoutes.request("/req-1/validate", { method: "PATCH" });
      expect(res.status).toBe(200);
      const mine = await bodyOf(await requestRoutes.request("/mine"));
      expect(mine[0].status).toBe("validated");
    });

    it("returns 404 for unknown request", async () => {
      expect((await requestRoutes.request("/missing/cancel", { method: "PATCH" })).status).toBe(404);
    });
  });

  describe("reopen / delete (owner)", () => {
    it("reopens a cancelled request", async () => {
      seedRequest(testDbRef.current, { status: "cancelled", dismissed: true });
      const res = await requestRoutes.request("/req-1/reopen", { method: "PATCH" });
      expect(res.status).toBe(200);
      const mine = await bodyOf(await requestRoutes.request("/mine"));
      expect(mine[0].status).toBe("pending");
    });

    it("rejects reopen when not cancelled", async () => {
      seedRequest(testDbRef.current);
      expect((await requestRoutes.request("/req-1/reopen", { method: "PATCH" })).status).toBe(400);
    });

    it("deletes own request", async () => {
      seedRequest(testDbRef.current);
      expect((await requestRoutes.request("/req-1", { method: "DELETE" })).status).toBe(200);
      const mine = await bodyOf(await requestRoutes.request("/mine"));
      expect(mine).toHaveLength(0);
    });

    it("forbids deleting another user's request", async () => {
      seedTestUser(testDbRef.current, {
        id: "user-2",
        username: "other",
        role: "member",
        createdAt: new Date(),
      });
      seedRequest(testDbRef.current, { userId: "user-2" });
      expect((await requestRoutes.request("/req-1", { method: "DELETE" })).status).toBe(403);
    });
  });
});
