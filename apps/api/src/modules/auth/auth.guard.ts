import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/auth/auth.constants";
import { resolveAuthenticatedSession } from "@/auth/session.util";
import { UnauthorizedError } from "../../errors/error";
import type { User } from "../user/user.dto";
import { resolveMediaToken } from "./media-token.service";

export type HonoAuthenticatedVariables = {
  user: User;
};

const STREAM_ROUTE_PATTERN = /^\/downloads\/[^/]+\/(stream|subtitles|file)/;

async function resolveUserFromStreamQuery(c: Context): Promise<User | null> {
  const tokenParam = c.req.query("token");
  if (typeof tokenParam !== "string") return null;
  return (await resolveMediaToken(tokenParam)) ?? null;
}

export const authGuard = async (c: Context<{ Variables: HonoAuthenticatedVariables }>, next: Next) => {
  const path = new URL(c.req.url).pathname;
  const allowQueryAuth = STREAM_ROUTE_PATTERN.test(path);
  const cookieToken = getCookie(c, SESSION_COOKIE_NAME);

  if (typeof cookieToken === "string") {
    const resolved = await resolveAuthenticatedSession(cookieToken);
    if (!resolved) throw new UnauthorizedError();

    if (resolved.rotatedToken) {
      setCookie(c, SESSION_COOKIE_NAME, resolved.rotatedToken, sessionCookieOptions);
    }

    c.set("user", resolved.user);
    await next();
    return;
  }

  if (allowQueryAuth) {
    const user = await resolveUserFromStreamQuery(c);
    if (user) {
      c.set("user", user);
      await next();
      return;
    }
  }

  throw new UnauthorizedError();
};
