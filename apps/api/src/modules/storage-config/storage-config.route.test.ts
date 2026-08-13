import { beforeEach, describe, expect, it, vi } from "vitest";

import { storageConfig } from "@/modules/storage-config/storage-config.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  process.env.STORAGE_ENCRYPTION_KEY = "test-storage-encryption-key";
  const fakeUser = { id: "user-1", username: "admin", role: "admin" as const, createdAt: new Date("2024-01-01") };
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
vi.mock("@/modules/auth/role.guard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/role.guard")>();
  return {
    ...actual,
    requireRole: () => async (_c: unknown, next: () => Promise<void>) => {
      await next();
    },
  };
});

vi.mock("@/modules/storage-config/remote-storage.service", () => ({
  invalidateStorageConfigCache: vi.fn(),
  remoteStorageService: {
    testConnection: vi.fn().mockResolvedValue({ success: true }),
    isAvailable: vi.fn().mockResolvedValue(true),
    isEnabled: vi.fn().mockResolvedValue(false),
  },
}));

const { storageConfigRoutes } = await import("./storage-config.route");

describe("Storage Config Routes", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
  });

  describe("GET /enabled", () => {
    it("returns enabled false when storage is off", async () => {
      const { remoteStorageService } = await import("./remote-storage.service");
      vi.mocked(remoteStorageService.isEnabled).mockResolvedValueOnce(false);
      const body = await bodyOf(await storageConfigRoutes.request("/enabled"));
      expect(body).toEqual({ enabled: false });
    });

    it("returns enabled true when storage feature is on", async () => {
      const { remoteStorageService } = await import("./remote-storage.service");
      vi.mocked(remoteStorageService.isEnabled).mockResolvedValueOnce(true);
      const body = await bodyOf(await storageConfigRoutes.request("/enabled"));
      expect(body).toEqual({ enabled: true });
    });
  });

  describe("GET /", () => {
    it("returns null when no config exists", async () => {
      const body = await bodyOf(await storageConfigRoutes.request("/"));
      expect(body).toBeNull();
    });

    it("returns config without password", async () => {
      testDbRef.current
        ?.insert(storageConfig)
        .values({
          id: "default",
          enabled: true,
          protocol: "ftp",
          host: "192.168.1.1",
          port: 21,
          secure: false,
          moviePath: "Movies",
          tvPath: "TV Shows",
          username: "user",
          password: "encrypted-password",
          updatedAt: new Date(),
        })
        .run();

      const body = await bodyOf(await storageConfigRoutes.request("/"));
      expect(body).toMatchObject({
        id: "default",
        enabled: true,
        autoTransfer: false,
        protocol: "ftp",
        host: "192.168.1.1",
        port: 21,
        secure: false,
        moviePath: "Movies",
        tvPath: "TV Shows",
        username: "user",
        hasPassword: true,
        diskQuotaGb: null,
      });
      expect(body.password).toBeUndefined();
    });
  });

  describe("PUT /", () => {
    it("creates a new FTP config", async () => {
      const body = await bodyOf(
        await storageConfigRoutes.request(
          "/",
          json("PUT", {
            enabled: true,
            protocol: "ftp",
            host: "192.168.1.254",
            port: 21,
            secure: false,
            moviePath: "Movies",
            tvPath: "Series",
            username: "admin",
            password: "secret",
          }),
        ),
      );

      expect(body).toMatchObject({
        enabled: true,
        protocol: "ftp",
        host: "192.168.1.254",
        port: 21,
        secure: false,
        moviePath: "Movies",
        tvPath: "Series",
        username: "admin",
        hasPassword: true,
      });
    });

    it("creates a new WebDAV config", async () => {
      const body = await bodyOf(
        await storageConfigRoutes.request(
          "/",
          json("PUT", {
            enabled: true,
            protocol: "webdav",
            host: "nas.local",
            port: 443,
            secure: true,
            username: "admin",
            password: "secret",
          }),
        ),
      );

      expect(body).toMatchObject({
        enabled: true,
        protocol: "webdav",
        host: "nas.local",
        port: 443,
        secure: true,
        username: "admin",
        hasPassword: true,
      });
    });

    it("updates existing config", async () => {
      await storageConfigRoutes.request(
        "/",
        json("PUT", {
          enabled: true,
          protocol: "ftp",
          host: "192.168.1.1",
          port: 21,
        }),
      );

      const body = await bodyOf(
        await storageConfigRoutes.request(
          "/",
          json("PUT", {
            enabled: false,
            protocol: "webdav",
            host: "192.168.1.2",
            port: 443,
            secure: true,
          }),
        ),
      );

      expect(body).toMatchObject({
        enabled: false,
        protocol: "webdav",
        host: "192.168.1.2",
        port: 443,
        secure: true,
      });
    });

    it("preserves existing password when not provided", async () => {
      await storageConfigRoutes.request(
        "/",
        json("PUT", {
          enabled: true,
          protocol: "ftp",
          host: "192.168.1.1",
          port: 21,
          password: "secret",
        }),
      );

      const body = await bodyOf(
        await storageConfigRoutes.request(
          "/",
          json("PUT", {
            enabled: true,
            protocol: "ftp",
            host: "192.168.1.1",
            port: 21,
          }),
        ),
      );

      expect(body.hasPassword).toBe(true);
    });
  });

  describe("DELETE /", () => {
    it("returns 404 when no config exists", async () => {
      const res = await storageConfigRoutes.request("/", { method: "DELETE" });
      expect(res.status).toBe(404);
    });

    it("deletes existing config", async () => {
      await storageConfigRoutes.request(
        "/",
        json("PUT", {
          enabled: true,
          protocol: "ftp",
          host: "192.168.1.1",
          port: 21,
        }),
      );

      const body = await bodyOf(await storageConfigRoutes.request("/", { method: "DELETE" }));
      expect(body).toEqual({ success: true });

      const getBody = await bodyOf(await storageConfigRoutes.request("/"));
      expect(getBody).toBeNull();
    });
  });

  describe("POST /test", () => {
    it("calls remoteStorageService.testConnection and returns result", async () => {
      const body = await bodyOf(
        await storageConfigRoutes.request(
          "/test",
          json("POST", {
            protocol: "ftp",
            host: "192.168.1.254",
            port: 21,
          }),
        ),
      );

      expect(body).toEqual({ success: true });
    });
  });

  describe("GET /status", () => {
    it("returns availability status", async () => {
      const body = await bodyOf(await storageConfigRoutes.request("/status"));
      expect(body).toEqual({ available: true });
    });
  });
});
