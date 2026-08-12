import { and, eq, lt, ne } from "drizzle-orm";
import ms from "ms";

import { logger } from "@/shared/helpers/logger.helper";

import { SESSION_DURATION_MS, SESSION_ROTATION_AGE_MS } from "@/auth/auth.constants";
import { db } from "@/db/db";
import { session } from "@/modules/auth/auth.schema";
import type { User } from "@/modules/user/user.schema";
import { user } from "@/modules/user/user.schema";
import { randomBytes } from "node:crypto";

const SESSION_CACHE_TTL_MS = ms("60s");
const SLIDING_EXTENSION_THRESHOLD_MS = ms("1d");

type CachedSession = {
  user: User;
  expiresAt: number;
};

const sessionCache = new Map<string, CachedSession>();

function invalidateSessionCache(token: string): void {
  sessionCache.delete(token);
}

function cacheSession(token: string, resolved: User): void {
  sessionCache.set(token, {
    user: resolved,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

function getCachedSession(token: string): User | null {
  const cached = sessionCache.get(token);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    sessionCache.delete(token);
    return null;
  }
  return cached.user;
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(session).values({
    token,
    userId,
    expiresAt,
  });

  return token;
}

export async function deleteOtherSessions(userId: string, keepToken: string): Promise<void> {
  await db.delete(session).where(and(eq(session.userId, userId), ne(session.token, keepToken)));
  for (const [token] of sessionCache) {
    const cached = sessionCache.get(token);
    if (cached?.user.id === userId && token !== keepToken) {
      sessionCache.delete(token);
    }
  }
}

export type ResolvedSession = {
  user: User;
  rotatedToken?: string;
};

async function fetchSessionWithUser(token: string): Promise<{
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  user: User;
} | null> {
  const [row] = await db
    .select({
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
    .where(eq(session.token, token))
    .limit(1);

  if (!row) return null;
  return row;
}

async function extendSessionExpiry(token: string, expiresAt: Date): Promise<void> {
  const newExpiry = new Date(Date.now() + SESSION_DURATION_MS);
  if (expiresAt.getTime() - Date.now() > SLIDING_EXTENSION_THRESHOLD_MS) return;

  await db.update(session).set({ expiresAt: newExpiry }).where(eq(session.token, token));
}

/**
 * Rotate session token if older than SESSION_ROTATION_AGE_MS.
 * Returns the new token when rotation occurred.
 */
async function rotateSessionIfStale(token: string, userId: string, createdAt: Date): Promise<string | undefined> {
  if (Date.now() - createdAt.getTime() < SESSION_ROTATION_AGE_MS) return undefined;

  const newToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.delete(session).where(eq(session.token, token));
  await db.insert(session).values({
    token: newToken,
    userId,
    expiresAt,
    createdAt: new Date(),
  });

  invalidateSessionCache(token);
  return newToken;
}

/**
 * Validate session and resolve user in a single DB query (cached 60s).
 * Extends expiry on activity and rotates token after 24h.
 */
export async function resolveAuthenticatedSession(token: string): Promise<ResolvedSession | null> {
  const cachedUser = getCachedSession(token);
  if (cachedUser) {
    return { user: cachedUser };
  }

  const row = await fetchSessionWithUser(token);
  if (!row) return null;

  if (row.expiresAt < new Date()) {
    await db.delete(session).where(eq(session.token, token));
    invalidateSessionCache(token);
    return null;
  }

  await extendSessionExpiry(token, row.expiresAt);
  const rotatedToken = await rotateSessionIfStale(token, row.userId, row.createdAt);
  const activeToken = rotatedToken ?? token;

  cacheSession(activeToken, row.user);

  return {
    user: row.user,
    rotatedToken,
  };
}

export async function deleteSession(token: string): Promise<void> {
  invalidateSessionCache(token);
  await db.delete(session).where(eq(session.token, token));
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
