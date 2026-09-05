import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { hashPassword } from "@/auth/password.util";
import {
  createSession,
  invalidateSessionsForUser,
  resolveAuthenticatedSession,
  revokeAllSessionsForUser,
} from "@/auth/session.util";
import { session } from "@/modules/auth/auth.schema";
import { user } from "@/modules/user/user.schema";
import { createTestDb, testDbRef } from "@/tests/test.helper";

describe("session.util", () => {
  beforeEach(() => {
    testDbRef.current = createTestDb();
    testDbRef.current
      .insert(user)
      .values({
        id: "u1",
        username: "alice",
        password: hashPassword("password123"),
        role: "member",
        createdAt: new Date(),
      })
      .run();
  });

  it("creates and resolves a session", async () => {
    const token = await createSession("u1");
    const resolved = await resolveAuthenticatedSession(token);
    expect(resolved?.user.username).toBe("alice");
  });

  it("returns null for invalid token", async () => {
    expect(await resolveAuthenticatedSession("invalid-token")).toBeNull();
  });

  it("rotates token after 24h and keeps grace for previous token", async () => {
    const token = await createSession("u1");
    const agedCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    testDbRef.current.update(session).set({ createdAt: agedCreatedAt }).run();

    const rotated = await resolveAuthenticatedSession(token);
    expect(rotated?.rotatedToken).toBeTruthy();

    const grace = await resolveAuthenticatedSession(token);
    expect(grace?.user.username).toBe("alice");
  });

  it("invalidates cached session data for user", async () => {
    const token = await createSession("u1");
    await resolveAuthenticatedSession(token);
    testDbRef.current.update(user).set({ username: "bob" }).where(eq(user.id, "u1")).run();

    const cached = await resolveAuthenticatedSession(token);
    expect(cached?.user.username).toBe("alice");

    invalidateSessionsForUser("u1");
    const refreshed = await resolveAuthenticatedSession(token);
    expect(refreshed?.user.username).toBe("bob");
  });

  it("revokes all DB sessions for user", async () => {
    const token = await createSession("u1");
    await resolveAuthenticatedSession(token);

    await revokeAllSessionsForUser("u1");

    expect(await resolveAuthenticatedSession(token)).toBeNull();
    const rows = testDbRef.current.select().from(session).all();
    expect(rows).toHaveLength(0);
  });
});
