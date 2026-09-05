import { beforeEach, describe, expect, it, vi } from "vitest";

import { download } from "@/modules/download/download.schema";
import {
  bodyOf,
  createAuthGuardMock,
  createTestDb,
  sampleTorrent,
  seedTestUser,
  type TestDb,
  testDbRef,
} from "@/tests/test.helper";

const { fakeUser, playbackInfo, directStream, liveStream, listSubtitles, getSubtitle } = vi.hoisted(() => {
  const fakeUser = { id: "user-1", username: "member", role: "member" as const, createdAt: new Date("2024-01-01") };
  return {
    fakeUser,
    playbackInfo: vi.fn(),
    directStream: vi.fn(),
    liveStream: vi.fn(),
    listSubtitles: vi.fn(),
    getSubtitle: vi.fn(),
  };
});

vi.mock("@/modules/auth/auth.guard", () => ({
  authGuard: createAuthGuardMock(fakeUser),
}));
vi.mock("./streaming.service", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./streaming.service")>();
  return {
    StreamingService: class extends mod.StreamingService {
      getDownload = async (id: string) => {
        const { downloadRepository } = await import("@/modules/download/download.repository");
        return downloadRepository.get(id);
      };
      getPlaybackInfo = playbackInfo;
      prepareDirectStream = directStream;
      prepareLiveStream = liveStream;
      listExternalSubtitles = listSubtitles;
      getSubtitleFile = getSubtitle;
    },
  };
});

const { streamingRoutes } = await import("./streaming.route");

function seedDownload(db: TestDb) {
  db.insert(download)
    .values({
      id: "dl-1",
      userId: fakeUser.id,
      torrent: sampleTorrent({ name: "Movie", done: true, progress: 1, length: 1000 }),
      createdAt: new Date(),
    })
    .run();
}

describe("Streaming Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
    seedDownload(testDbRef.current);
    playbackInfo.mockReset();
    directStream.mockReset();
    liveStream.mockReset();
    listSubtitles.mockReset();
    getSubtitle.mockReset();
  });

  describe("GET /:id/info", () => {
    it("returns playback info", async () => {
      playbackInfo.mockResolvedValue({ mode: "direct", duration: 90, seekable: true, origin: "local" });
      const body = await bodyOf(await streamingRoutes.request("/dl-1/info"));
      expect(body).toEqual({ mode: "direct", duration: 90, seekable: true, origin: "local" });
    });

    it("returns 404 for unknown download", async () => {
      expect((await streamingRoutes.request("/missing/info")).status).toBe(404);
    });
  });

  describe("GET /:id/direct", () => {
    it("sets range headers from service", async () => {
      directStream.mockResolvedValue({
        status: 200,
        headers: { "Content-Type": "video/mp4", "Content-Length": "10" },
      });
      const res = await streamingRoutes.request("/dl-1/direct");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
    });

    it("returns 206 for ranged response", async () => {
      directStream.mockResolvedValue({
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": "bytes 0-1/10",
          "Content-Length": "2",
        },
      });
      const res = await streamingRoutes.request("/dl-1/direct", { headers: { Range: "bytes=0-1" } });
      expect(res.status).toBe(206);
      expect(res.headers.get("Content-Range")).toBe("bytes 0-1/10");
    });
  });

  describe("GET /:id/live", () => {
    it("returns live stream headers", async () => {
      liveStream.mockResolvedValue({
        headers: { "Content-Type": "video/mp4" },
        pipe: async () => {},
      });
      const res = await streamingRoutes.request("/dl-1/live");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("video/mp4");
    });
  });

  describe("GET /:id/subtitles", () => {
    it("lists external subtitles", async () => {
      listSubtitles.mockResolvedValue({ paths: ["Movie/Movie.en.srt"] });
      const body = await bodyOf(await streamingRoutes.request("/dl-1/subtitles"));
      expect(body).toEqual({ paths: ["Movie/Movie.en.srt"] });
    });
  });

  describe("GET /:id/subtitles/:filePath", () => {
    it("serves subtitle content", async () => {
      getSubtitle.mockResolvedValue({ content: "WEBVTT\n", contentType: "text/vtt; charset=utf-8" });
      const res = await streamingRoutes.request("/dl-1/subtitles/Movie%2FMovie.en.srt");
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/vtt; charset=utf-8");
      expect(await res.text()).toBe("WEBVTT\n");
    });
  });
});
