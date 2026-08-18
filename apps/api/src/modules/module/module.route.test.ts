import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { module } from "@/modules/module/module.schema";
import { createAuthGuardMock, seedTestUser } from "@/tests/route-test.helper";
import { bodyOf, createTestDb, json, type TestDb } from "@/tests/test.helper";

const { fakeUser, testDbRef } = vi.hoisted(() => {
  const fakeUser = {
    id: "admin-1",
    username: "admin",
    role: "admin" as const,
    createdAt: new Date("2024-01-01"),
  };
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
vi.mock("@/modules/module/module.seed", () => ({
  ensureSystemModules: vi.fn(async () => {}),
}));
vi.mock("@/modules/storage-config/remote/remote-storage.service", () => ({
  remoteStorageService: {
    isEnabled: vi.fn(async () => false),
  },
  invalidateStorageConfigCache: vi.fn(),
}));
vi.mock("@/modules/storage-config/remote/remote-sync.service", () => ({
  runRemoteSync: vi.fn(),
  runManualSync: vi.fn(),
}));

const { moduleRoutes } = await import("./module.route");

function seedTmdb(db: TestDb) {
  db.insert(module)
    .values({
      id: "tmdb-default",
      type: "tmdb",
      category: "system",
      enabled: true,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
}

describe("Module Routes", () => {
  beforeEach(() => {
    fakeUser.role = "admin";
    testDbRef.current = createTestDb();
    seedTestUser(testDbRef.current, fakeUser);
    seedTmdb(testDbRef.current);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );
  });

  it("GET / lists modules including system TMDB", async () => {
    const body = await bodyOf(await moduleRoutes.request("/"));
    expect(body.some((m: { type: string }) => m.type === "tmdb")).toBe(true);
  });

  it("GET /:id returns module for admin with api key when configured", async () => {
    testDbRef.current
      ?.update(module)
      .set({ config: { apiKey: "test-tmdb-key" } })
      .where(eq(module.id, "tmdb-default"))
      .run();

    const body = await bodyOf(await moduleRoutes.request("/tmdb-default"));
    expect(body.config.apiKey).toBe("test-tmdb-key");
  });

  it("PATCH /:id clears TMDB api key override when empty string sent", async () => {
    testDbRef.current
      ?.update(module)
      .set({ config: { apiKey: "old-key" } })
      .where(eq(module.id, "tmdb-default"))
      .run();

    const res = await moduleRoutes.request("/tmdb-default", json("PATCH", { config: { apiKey: "" } }));
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.config.apiKey).toBeUndefined();
  });

  it("POST /:id/test probes draft config", async () => {
    const body = await bodyOf(
      await moduleRoutes.request("/tmdb-default/test", json("POST", { config: { apiKey: "draft-key" } })),
    );
    expect(body.ok).toBe(true);
  });

  it("DELETE /:id rejects locked system modules", async () => {
    expect((await moduleRoutes.request("/tmdb-default", { method: "DELETE" })).status).toBe(400);
  });

  it("POST / creates a jackett module", async () => {
    const res = await moduleRoutes.request(
      "/",
      json("POST", {
        type: "jackett",
        config: { url: "http://127.0.0.1:9117", apiKey: "secret-key" },
      }),
    );
    expect(res.status).toBe(201);
    const body = await bodyOf(res);
    expect(body.type).toBe("jackett");
  });
});
