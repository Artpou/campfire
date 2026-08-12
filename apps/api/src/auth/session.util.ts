import { and, eq, lt, ne, or } from "drizzle-orm";
import ms from "ms";

import { logger } from "@/shared/helpers/logger.helper";

import { SESSION_DURATION_MS, SESSION_ROTATION_AGE_MS } from "@/auth/auth.constants";
import { db } from "@/db/db";
import { session } from "@/modules/auth/auth.schema";
import type { User } from "@/modules/user/user.schema";
import { user } from "@/modules/user/user.schema";
import { createHash, randomBytes } from "node:crypto";

const SESSION_CACHE_TTL_MS = ms("60s");
const SLIDING_EXTENSION_THRESHOLD_MS = ms("1d");
const GRACE_PERIOD_MS = ms("30s");

type CachedSession = {
  user: User;
  /** Wall-clock expiry of the DB session row. */
  sessionExpiresAt: number;
  /** Session createdAt — used to know when rotation is due without a DB hit. */
  createdAt: number;
  /** When this cache entry itself expires. */
  cachedUntil: number;
};

const sessionCache = new Map<string, CachedSession>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function invalidateSessionCache(rawToken: string): void {
  sessionCache.delete(hashToken(rawToken));
}

/** Drop all cached sessions for a user (role change, delete, password change). */
export function invalidateSessionsForUser(userId: string): void {
  for (const [tokenHash, cached] of sessionCache) {
    if (cached.user.id === userId) sessionCache.delete(tokenHash);
  }
}

function cacheSession(rawToken: string, resolved: User, sessionExpiresAt: Date, createdAt: Date): void {
  sessionCache.set(hashToken(rawToken), {
    user: resolved,
    sessionExpiresAt: sessionExpiresAt.getTime(),
    createdAt: createdAt.getTime(),
    cachedUntil: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

function getCachedSession(rawToken: string): CachedSession | null {
  const cached = sessionCache.get(hashToken(rawToken));
  if (!cached) return null;
  const now = Date.now();
  if (cached.cachedUntil < now || cached.sessionExpiresAt < now) {
    sessionCache.delete(hashToken(rawToken));
    return null;
  }
  return cached;
}

/** Cache hits still fall through to DB when rotation or sliding extension is due. */
function needsDbRefresh(cached: CachedSession): boolean {
  const now = Date.now();
  return (
    now - cached.createdAt >= SESSION_ROTATION_AGE_MS || cached.sessionExpiresAt - now <= SLIDING_EXTENSION_THRESHOLD_MS
  );
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(session).values({
    token: tokenHash,
    userId,
    expiresAt,
    createdAt: new Date(),
  });

  return token;
}

export async function deleteOtherSessions(userId: string, keepRawToken: string): Promise<void> {
  const keepHash = hashToken(keepRawToken);
  await db.delete(session).where(and(eq(session.userId, userId), ne(session.token, keepHash)));

  for (const [tokenHash, cached] of sessionCache) {
    if (cached.user.id === userId && tokenHash !== keepHash) {
      sessionCache.delete(tokenHash);
    }
  }
}

export type ResolvedSession = {
  user: User;
  rotatedToken?: string;
};

async function fetchSessionWithUser(tokenHash: string): Promise<{
  token: string;
  previousToken: string | null;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user: User;
} | null> {
  const [row] = await db
    .select({
      token: session.token,
      previousToken: session.previousToken,
      userId: session.userId,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      user: {
        id: user.id,
        username: user.username,
        pseudo: user.pseudo,
        avatarPath: user.avatarPath,
        role: user.role,
        letterboxdUsername: user.letterboxdUsername,
        createdAt: user.createdAt,
      },
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(or(eq(session.token, tokenHash), eq(session.previousToken, tokenHash)))
    .limit(1);

  if (!row) return null;
  return row;
}

/**
 * Validate session and resolve user in a single DB query (cached 60s).
 * Extends expiry on activity and rotates token after 24h.
 */
export async function resolveAuthenticatedSession(rawToken: string): Promise<ResolvedSession | null> {
  const tokenHash = hashToken(rawToken);

  const cached = getCachedSession(rawToken);
  if (cached && !needsDbRefresh(cached)) {
    return { user: cached.user };
  }

  const row = await fetchSessionWithUser(tokenHash);
  if (!row) return null;

  if (row.expiresAt < new Date()) {
    await db.delete(session).where(or(eq(session.token, tokenHash), eq(session.previousToken, tokenHash)));
    invalidateSessionCache(rawToken);
    return null;
  }

  const now = Date.now();

  // Previous token reuse during grace period (30s max)
  if (row.previousToken === tokenHash) {
    const graceElapsed = now - row.createdAt.getTime();

    if (graceElapsed < GRACE_PERIOD_MS) {
      return { user: row.user };
    }

    logger.warn(
      "SESSION",
      `Stale previousToken reuse attempt for user ${row.userId} (${Math.round(graceElapsed / 1000)}s after rotation)`,
    );
    return null;
  }

  const isStale = now - row.createdAt.getTime() >= SESSION_ROTATION_AGE_MS;

  // Token rotation
  if (isStale) {
    const newToken = generateSessionToken();
    const newTokenHash = hashToken(newToken);
    const newExpiresAt = new Date(now + SESSION_DURATION_MS);

    const updated = await db
      .update(session)
      .set({
        token: newTokenHash,
        previousToken: tokenHash,
        expiresAt: newExpiresAt,
        createdAt: new Date(),
      })
      .where(eq(session.token, tokenHash))
      .returning({ token: session.token });

    if (updated.length > 0) {
      cacheSession(newToken, row.user, newExpiresAt, new Date());
      invalidateSessionCache(rawToken);
      return { user: row.user, rotatedToken: newToken };
    }

    // If the request loses the race, the session remains valid for this request
    return { user: row.user };
  }

  // Sliding extension if near expiration
  let expiresAt = row.expiresAt;
  if (row.expiresAt.getTime() - now <= SLIDING_EXTENSION_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_DURATION_MS);
    await db.update(session).set({ expiresAt }).where(eq(session.token, tokenHash));
  }

  cacheSession(rawToken, row.user, expiresAt, row.createdAt);
  return { user: row.user };
}

export async function deleteSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  invalidateSessionCache(rawToken);
  await db.delete(session).where(or(eq(session.token, tokenHash), eq(session.previousToken, tokenHash)));
}

async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(session).where(lt(session.expiresAt, now));
}

setInterval(() => {
  cleanupExpiredSessions().catch((err) => {
    logger.error("SESSION", "Failed to cleanup expired sessions:", err);
  });
}, ms("1h"));
