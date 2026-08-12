import { beforeEach, describe, expect, it, vi } from "vitest";

import { session } from "@/modules/auth/auth.schema";
import { user } from "@/modules/user/user.schema";
import { bodyOf, createTestDb, type TestDb } from "@/tests/test.helper";
import { createHash } from "node:crypto";
import { activityLog } from "./activity-log.schema";
import { ActivityLogService } from "./activity-log.service";

const { testDbRef } = vi.hoisted(() => {
  const testDbRef = { current: null as TestDb | null };
  return { testDbRef };
});

vi.mock("@/db/db", () => ({
  get db() {
    return testDbRef.current;
  },
}));

const { activityLogRoutes } = await import("./activity-log.route");

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

function seedLogs(db: TestDb | null) {
  if (!db) throw new Error("Database not found");

  db.insert(activityLog)
    .values([
      {
        id: "log-1",
        userId: "owner-1",
        type: "SUCCESS",
        action: "DOWNLOAD_START",
        title: "Download started: Test",
        createdAt: new Date(),
      },
      {
        id: "log-2",
        userId: "member-1",
        type: "INFO",
        action: "USER_LOGIN",
        title: "User logged in",
        createdAt: new Date(),
      },
    ])
    .run();
}

function withAuth(token: string) {
  return { headers: { Cookie: `session=${token}` } };
}

describe("Activity Log Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedUsers(testDbRef.current);
  });

  describe("GET /", () => {
    it("returns 401 without session", async () => {
      const res = await activityLogRoutes.request("/");
      expect(res.status).toBe(401);
    });

    it("returns 403 for viewer role", async () => {
      const res = await activityLogRoutes.request("/", withAuth(VIEWER_TOKEN));
      expect(res.status).toBe(403);
    });

    it("returns logs for member (own logs only)", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityLogRoutes.request("/", withAuth(MEMBER_TOKEN)));
      expect(body.results).toBeDefined();
      for (const log of body.results) {
        expect(log.userId).toBe("member-1");
      }
    });

    it("returns all logs for owner (privileged)", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityLogRoutes.request("/", withAuth(OWNER_TOKEN)));
      expect(body.results).toBeDefined();
      expect(body.results.length).toBe(2);
    });

    it("filters by action", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityLogRoutes.request("/?action=DOWNLOAD_START", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(1);
      expect(body.results[0].action).toBe("DOWNLOAD_START");
    });

    it("filters by type", async () => {
      seedLogs(testDbRef.current);
      const body = await bodyOf(await activityLogRoutes.request("/?type=SUCCESS", withAuth(OWNER_TOKEN)));
      expect(body.results.length).toBe(1);
      expect(body.results[0].type).toBe("SUCCESS");
    });
  });

  describe("ActivityLogService.log", () => {
    it("inserts a log entry", async () => {
      await ActivityLogService.log({
        userId: "owner-1",
        type: "INFO",
        action: "USER_LOGIN",
        title: "Test log",
        metadata: { key: "value" },
      });

      const logs = testDbRef.current?.select().from(activityLog).all();

      if (!logs) throw new Error("Logs not found");

      expect(logs.length).toBe(1);
      expect(logs[0].title).toBe("Test log");
      expect(logs[0].metadata).toBe('{"key":"value"}');
    });

    it("handles null userId", async () => {
      await ActivityLogService.log({
        type: "ERROR",
        action: "SYSTEM_ERROR",
        title: "System error",
      });

      const logs = testDbRef.current?.select().from(activityLog).all();

      if (!logs) throw new Error("Logs not found");

      expect(logs.length).toBe(1);
      expect(logs[0].userId).toBeNull();
    });
  });
});
