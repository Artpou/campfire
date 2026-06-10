import { beforeEach, describe, expect, it, vi } from "vitest";

import { torrentDownload } from "@/modules/download/download.schema";
import { user } from "@/modules/user/user.schema";
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
  authGuard: async (c: unknown, next: () => Promise<void>) => {
    (c as { set: (k: string, v: unknown) => void }).set("user", fakeUser);
    await next();
  },
}));
vi.mock("@/modules/download/webtorrent.client", () => {
  const makeFakeTorrent = () => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    return {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
        if (event === "ready") setTimeout(() => cb(), 0);
      }),
      destroy: vi.fn(),
      infoHash: "fakehash",
      magnetURI: "magnet:?xt=urn:btih:fake",
      name: "FakeTorrent",
      length: 1000,
      path: "/tmp",
    };
  };

  return {
    WebTorrentClient: {
      getClient: () => ({ add: vi.fn(() => makeFakeTorrent()) }),
      getActiveTorrent: vi.fn(() => null),
      getPausedData: vi.fn(() => undefined),
      deleteActiveTorrent: vi.fn(),
      setPausedData: vi.fn(),
      clearPausedData: vi.fn(),
      setActiveTorrent: vi.fn(),
      setupTorrentHandlers: vi.fn(),
    },
  };
});

const { downloadRoutes } = await import("./download.route");

describe("Download Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: fakeUser.id, username: fakeUser.username, password: "x", role: "member", createdAt: new Date() })
      .run();
  });

  describe("GET / - list downloads", () => {
    it("returns empty list", async () => {
      expect(await bodyOf(await downloadRoutes.request("/"))).toEqual([]);
    });

    it("returns downloads", async () => {
      testDbRef.current
        ?.insert(torrentDownload)
        .values({
          id: "dl-1",
          userId: fakeUser.id,
          magnetUri: "magnet:?xt=urn:btih:abc",
          infoHash: "abc",
          name: "Test",
          status: "downloading",
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/"));
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Test");
    });
  });

  describe("GET /:id", () => {
    it("returns 404 for unknown", async () => {
      expect((await downloadRoutes.request("/nope")).status).toBe(404);
    });

    it("returns download details", async () => {
      testDbRef.current
        ?.insert(torrentDownload)
        .values({
          id: "dl-1",
          userId: fakeUser.id,
          magnetUri: "magnet:?xt=urn:btih:abc",
          infoHash: "abc",
          name: "Movie",
          status: "completed",
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/dl-1"));
      expect(body).toMatchObject({ id: "dl-1", name: "Movie", status: "completed" });
    });
  });

  describe("POST / - start download", () => {
    it("creates a new download", async () => {
      const body = await bodyOf(
        await downloadRoutes.request(
          "/",
          json("POST", { magnetUri: "magnet:?xt=urn:btih:new", name: "New Movie", size: 1000000 }),
        ),
      );
      expect(body).toMatchObject({ name: "New Movie", status: "downloading", userId: fakeUser.id });
    });

    it("returns existing if magnet already exists", async () => {
      testDbRef.current
        ?.insert(torrentDownload)
        .values({
          id: "existing",
          userId: fakeUser.id,
          magnetUri: "magnet:?xt=urn:btih:dup",
          infoHash: "dup",
          name: "Dup",
          status: "completed",
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(
        await downloadRoutes.request(
          "/",
          json("POST", { magnetUri: "magnet:?xt=urn:btih:dup", name: "Dup", size: 100 }),
        ),
      );
      expect(body.id).toBe("existing");
    });
  });

  describe("DELETE /:id", () => {
    it("deletes a download", async () => {
      testDbRef.current
        ?.insert(torrentDownload)
        .values({
          id: "dl-del",
          userId: fakeUser.id,
          magnetUri: "magnet:?xt=urn:btih:del",
          infoHash: "del",
          name: "Del",
          status: "completed",
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await downloadRoutes.request("/dl-del", { method: "DELETE" }));
      expect(body.success).toBe(true);
    });
  });
});
