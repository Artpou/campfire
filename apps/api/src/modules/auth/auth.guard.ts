import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import { validateSession } from "@/auth/session.util";
import { db } from "@/db/db";
import { UnauthorizedError } from "../../errors/error";
import type { User } from "../user/user.dto";
import { user } from "../user/user.schema";

const SESSION_COOKIE_NAME = "session";

export type HonoAuthenticatedVariables = {
  user: User;
};

export const authGuard = async (c: Context<{ Variables: HonoAuthenticatedVariables }>, next: Next) => {
  const path = new URL(c.req.url).pathname;
  const allowQuerySession = /^\/downloads\/[^/]+\/(stream|subtitles|file)/.test(path);
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME) || (allowQuerySession ? c.req.query("session") : undefined);

  if (typeof sessionToken !== "string") {
    throw new UnauthorizedError();
  }

  const userId = await validateSession(sessionToken);
  if (!userId) throw new UnauthorizedError();

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, username: true, role: true, createdAt: true },
  });
  if (!currentUser) throw new UnauthorizedError();

  c.set("user", currentUser);
  await next();
};
