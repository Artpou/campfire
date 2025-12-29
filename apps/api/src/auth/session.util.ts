import { eq, lt } from "drizzle-orm";
import ms from "ms";

import { db } from "@/db/db";
import { session } from "@/db/schema";
import { randomBytes } from "node:crypto";

const SESSION_DURATION_MS = ms("7d");

/**
 * Generate a random session token (32 bytes hex)
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new session for a user
 * Returns the session token
 */
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

/**
 * Validate a session token and return the user ID
 * Returns null if the session is invalid or expired
 */
export async function validateSession(token: string): Promise<string | null> {
  const [sessionData] = await db.select().from(session).where(eq(session.token, token)).limit(1);

  if (!sessionData) return null;

  // Check if session is expired
  if (sessionData.expiresAt < new Date()) {
    await db.delete(session).where(eq(session.token, token));
    return null;
  }

  return sessionData.userId;
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  await db.delete(session).where(eq(session.token, token));
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = new Date();
  await db.delete(session).where(lt(session.expiresAt, now));
}

// Clean up expired sessions every hour
setInterval(() => {
  cleanupExpiredSessions().catch((err) => {
    console.error("Failed to cleanup expired sessions:", err);
  });
}, ms("1h"));
