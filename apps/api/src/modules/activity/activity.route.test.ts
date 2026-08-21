import { beforeEach, describe, expect, it } from "vitest";

import { session } from "@/modules/auth/auth.schema";
import { user } from "@/modules/user/user.schema";
import { bodyOf, createTestDb, type TestDb, testDbRef } from "@/tests/test.helper";
import { createHash } from "node:crypto";
import { activityLog } from "./activity.schema";
import { ActivityService } from "./activity.service";

const { activityRoutes } = await import("./activity.route");

const OWNER_TOKEN = "owner-session-token";
const MEMBER_TOKEN = "member-session-token";
const VIEWER_TOKEN = "viewer-session-token";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function seedUsers(db: TestDb) {
  db.insert(user)
    .values([
      { id: "owner-1", username: "owner", password: "x", role: "owner", createdAt: new Date() },
      { id: "member-1", username: "member", password: "x", role: "member", createdAt: new Date() },
      { id: "viewer-1", username: "viewer", password: "x", role: "viewer", createdAt: new Date() },
    ])
    .run();

  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  db.insert(session)
    .values([
      { token: hashToken(OWNER_TOKEN), userId: "owner-1", expiresAt: future, createdAt: new Date() },
      { token: hashToken(MEMBER_TOKEN), userId: "member-1", expiresAt: future, createdAt: new Date() },
      { token: hashToken(VIEWER_TOKEN), userId: "viewer-1", expiresAt: future, createdAt: new Date() },
    ])
    .run();
}

function seedLogs(db: TestDb) {
  db.insert(activityLog)
    .values([
      {
        id: "log-1",
        userId: "owner-1",
        type: "SUCCESS",
        action: "DOWNLOAD_START",
        createdAt: new Date(),
      },
      {
        id: "log-2",
        userId: "member-1",
        type: "SUCCESS",
        action: "USER_LOGIN",
        createdAt: new Date(),
      },
    ])
    .run();
}

function withAuth(token: string) {
  return { headers: { Cookie: `session=${token}` } };
}

describe("Activity Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedUsers(testDbRef.current);
  });

  describe("GET /", () => {
    it("returns 401 without session", async () => {
      const res = await activityRoutes.request("/");
      expect(res.status).toBe(401);
    });

    it("returns 403 for viewer role", async () => {
      const res = await activityRoutes.request("/", withAuth(VIEWER_TOKEN));
      expect(res.status).toBe(403);
    });

    it("returns logs for member (own logs only)", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/", withAuth(MEMBER_TOKEN)));
      expect(body.results).toBeDefined();
      for (const log of body.results) {
        expect(log.userId).toBe("member-1");
      }
    });

    it("returns all logs for owner (privileged)", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/", withAuth(OWNER_TOKEN)));
      expect(body.results).toBeDefined();
      expect(body.results.length).toBe(2);
    });

    it("filters by action", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/?action=DOWNLOAD_START", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(1);
      expect(body.results[0].action).toBe("DOWNLOAD_START");
    });

    it("filters by type", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/?type=SUCCESS", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(2);
    });

    it("filters by category", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/?category=user", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(1);
      expect(body.results[0].action).toBe("USER_LOGIN");
    });

    it("searches action and media title", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityRoutes.request("/?q=LOGIN", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(1);
      expect(body.results[0].action).toBe("USER_LOGIN");
    });

    it("includes user, media and module relations", async () => {
      const { media } = await import("@/modules/media/media.schema");
      const { module } = await import("@/modules/module/module.schema");
      testDbRef.current.insert(media).values({ id: 42, type: "movie", title: "Dune", imdbId: "tt42" }).run();
      testDbRef.current
        .insert(module)
        .values({
          id: "mod-1",
          type: "jackett",
          category: "indexer",
          enabled: true,
          config: { url: "http://localhost:9117", apiKey: "x" },
        })
        .run();
      testDbRef.current
        .insert(activityLog)
        .values({
          id: "log-media",
          userId: "owner-1",
          mediaId: 42,
          moduleId: "mod-1",
          type: "SUCCESS",
          action: "DOWNLOAD_COMPLETE",
          createdAt: new Date(),
        })
        .run();

      const body = await bodyOf(await activityRoutes.request("/?q=Dune", withAuth(OWNER_TOKEN)));
      expect(body.results[0].media?.title).toBe("Dune");
      expect(body.results[0].user?.username).toBe("owner");
      expect(body.results[0].module?.type).toBe("jackett");
      expect(body.results[0].module?.category).toBe("indexer");
    });
  });

  describe("ActivityService.log", () => {
    it("inserts a log entry from the constructor user", async () => {
      const owner = { id: "owner-1" } as never;
      await new ActivityService(owner).log({
        action: "USER_LOGIN",
        metadata: { key: "value" },
      });

      const logs = testDbRef.current.select().from(activityLog).all();

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBe("owner-1");
      expect(logs[0].type).toBe("SUCCESS");
      expect(logs[0].metadata).toBe('{"key":"value"}');
      expect(logs[0].mediaId).toBeNull();
    });

    it("strips sensitive metadata", async () => {
      await new ActivityService({ id: "owner-1" } as never).log({
        action: "ADDON_MODIFY",
        metadata: { url: "http://localhost", apiKey: "secret", password: "p" },
      });

      const logs = testDbRef.current.select().from(activityLog).all();
      expect(logs[0].metadata).toBe('{"url":"http://localhost"}');
    });

    it("stores mediaId and moduleId from params", async () => {
      const { media } = await import("@/modules/media/media.schema");
      const { module } = await import("@/modules/module/module.schema");
      testDbRef.current.insert(media).values({ id: 7, type: "movie", title: "X", imdbId: "tt7" }).run();
      testDbRef.current
        .insert(module)
        .values({
          id: "mod-2",
          type: "stremio",
          category: "indexer",
          enabled: true,
          config: { manifestUrl: "https://example.com/manifest.json" },
        })
        .run();

      await new ActivityService({ id: "owner-1" } as never).log({
        mediaId: 7,
        moduleId: "mod-2",
        action: "DOWNLOAD_START",
      });

      const logs = testDbRef.current.select().from(activityLog).all();
      expect(logs[0].mediaId).toBe(7);
      expect(logs[0].moduleId).toBe("mod-2");
    });

    it("handles null userId", async () => {
      await new ActivityService().log({
        type: "ERROR",
        action: "SYSTEM_ERROR",
      });

      const logs = testDbRef.current.select().from(activityLog).all();

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBeNull();
    });
  });
});
