import { beforeEach, describe, expect, it, vi } from "vitest";

import { download, type TorrentLiveData } from "@/modules/download/download.schema";
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
vi.mock("@/modules/auth/role.guard", () => ({
  requireRole: () => async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));
vi.mock("./subtitle.service", async (importOriginal) => {
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  const mod = (await importOriginal()) as any;
  class MockSubtitleService extends mod.SubtitleService {
    search = vi.fn(async () => ({
      status: true,
      results: [{ name: "Sub Pack", author: "x", url: "/dl/abc", language: "English" }],
    }));
    download = vi.fn(async () => ({ relativePath: "Movie/Movie.en.srt" }));
  }
  return { SubtitleService: MockSubtitleService };
});

const { subtitleRoutes } = await import("./subtitle.route");

describe("Subtitle Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({ id: fakeUser.id, username: fakeUser.username, password: "x", role: "member", createdAt: new Date() })
      .run();
  });

  describe("GET /search", () => {
    it("returns results from SUBDL", async () => {
      const body = await bodyOf(await subtitleRoutes.request("/search?tmdb_id=123&languages=en&type=movie"));
      expect(body.status).toBe(true);
      expect(body.results).toHaveLength(1);
    });

    it("returns 400 without required params", async () => {
      expect((await subtitleRoutes.request("/search")).status).toBe(400);
    });
  });

  describe("POST /download", () => {
    it("downloads subtitle for user's download", async () => {
      testDbRef.current
        ?.insert(download)
        .values({
          id: "dl-1",
          userId: fakeUser.id,
          torrent: {
            infoHash: "abc",
            magnetURI: "magnet:?xt=urn:btih:abc",
            announce: [],
            "announce-list": [],
            timeRemaining: 0,
            received: 0,
            downloaded: 0,
            uploaded: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            progress: 1,
            ratio: 0,
            length: 1000,
            pieceLength: 524288,
            lastPieceLength: 0,
            numPeers: 0,
            path: "./downloads",
            ready: true,
            paused: false,
            done: true,
            name: "Movie",
            created: new Date(),
            maxWebConns: 4,
            files: [],
          } as unknown as TorrentLiveData,
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(
        await subtitleRoutes.request(
          "/download",
          json("POST", { downloadId: "dl-1", url: "/dl/abc.zip", language: "English", mediaTitle: "Movie" }),
        ),
      );
      expect(body.relativePath).toBe("Movie/Movie.en.srt");
    });

    it("returns 404 when download does not exist", async () => {
      expect(
        (
          await subtitleRoutes.request(
            "/download",
            json("POST", { downloadId: "nope", url: "/x", language: "en", mediaTitle: "x" }),
          )
        ).status,
      ).toBe(404);
    });
  });
});
