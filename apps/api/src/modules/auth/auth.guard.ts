import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/auth/auth.constants";
import { resolveAuthenticatedSession } from "@/auth/session.util";
import { UnauthorizedError } from "../../errors/error";
import type { User } from "../user/user.dto";

export type HonoAuthenticatedVariables = {
  user: User;
};

export const authGuard = async (c: Context<{ Variables: HonoAuthenticatedVariables }>, next: Next) => {
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);
  if (typeof cookieToken !== "string") throw new UnauthorizedError();

  const resolved = await resolveAuthenticatedSession(cookieToken);
  if (!resolved) throw new UnauthorizedError();

  if (resolved.rotatedToken) {
    setCookie(c, SESSION_COOKIE_NAME, resolved.rotatedToken, sessionCookieOptions);
  }

  c.set("user", resolved.user);
  await next();
};
