import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import { validateSession } from "@/auth/session.util";
import { UnauthorizedError } from "../../errors/error";
import { UserService } from "../user/user.service";

const SESSION_COOKIE_NAME = "session";

export const authGuard = async (c: Context, next: Next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME) || c.req.query("session");

  if (typeof sessionToken !== "string") {
    throw new UnauthorizedError();
  }

  const userId = await validateSession(sessionToken);
  if (!userId) throw new UnauthorizedError();

  const currentUser = await new UserService().getById(userId);
  if (!currentUser) throw new UnauthorizedError();

  c.set("user", currentUser);
  await next();
};
