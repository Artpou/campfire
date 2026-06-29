import { eq, lt } from "drizzle-orm";
import ms from "ms";

import { db } from "@/db/db";
import { logger } from "@/helpers/logger.helper";
import type { User } from "@/modules/user/user.dto";
import { user } from "@/modules/user/user.schema";
import { mediaToken } from "./media-token.schema";

const MEDIA_TOKEN_TTL_MS = ms("1h");

function isExpired(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() > MEDIA_TOKEN_TTL_MS;
}

export async function createMediaToken(userId: string): Promise<string> {
  const [row] = await db.insert(mediaToken).values({ userId }).returning({ id: mediaToken.id });
  return row.id;
}

export async function resolveMediaToken(token: string): Promise<User | undefined> {
  const [row] = await db
    .select({
      tokenId: mediaToken.id,
      createdAt: mediaToken.createdAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
    .from(mediaToken)
    .innerJoin(user, eq(mediaToken.userId, user.id))
    .where(eq(mediaToken.id, token))
    .limit(1);

  if (!row) return undefined;

  if (isExpired(row.createdAt)) {
    await db.delete(mediaToken).where(eq(mediaToken.id, row.tokenId));
    return undefined;
  }

  return row.user;
}

function cleanExpiredMediaTokens(): void {
  const cutoff = new Date(Date.now() - MEDIA_TOKEN_TTL_MS);
  db.delete(mediaToken)
    .where(lt(mediaToken.createdAt, cutoff))
    .catch((err) => {
      logger.error("MEDIA_TOKEN", "Failed to cleanup expired media tokens:", err);
    });
}

setInterval(cleanExpiredMediaTokens, ms("1h"));
