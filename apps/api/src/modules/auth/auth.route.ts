import { zValidator } from "@hono/zod-validator";
import { loginDto, registerDto } from "@seedarr/contracts";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { NotFoundError, UnauthorizedError } from "@/shared/errors/error";
import { authRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/auth/auth.constants";
import { hashPassword } from "@/auth/password.util";
import { createSession, deleteOtherSessions, resolveAuthenticatedSession, revokeSession } from "@/auth/session.util";
import { ActivityService, trackRoute } from "@/modules/activity/activity.service";
import { getSessionUser } from "@/modules/auth/auth.service";
import { UserService } from "../user/user.service";

export const authRoutes = new Hono()
  .get("/has-owner", authRateLimiter, async (c) => {
    const userService = new UserService();
    const hasOwner = await userService.hasOwner();
    return c.json({ hasOwner });
  })
  .post("/register", authRateLimiter, zValidator("json", registerDto), async (c) => {
    const { username, password } = c.req.valid("json");
    const userService = new UserService();

    const newUser = await trackRoute(c, { action: "USER_CREATE", metadata: { username } }, () =>
      userService.register(username, hashPassword(password)),
    );
    const sessionToken = await createSession(newUser.id);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    return c.json(newUser);
  })
  .post("/login", authRateLimiter, zValidator("json", loginDto), async (c) => {
    const { username, password } = c.req.valid("json");

    const user = await trackRoute(c, { action: "USER_LOGIN", metadata: { username } }, async () => {
      const userService = new UserService();
      const userId = await userService.verifyLogin(username, password);
      const sessionToken = await createSession(userId);
      await deleteOtherSessions(userId, sessionToken);
      setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
      return userService.get(userId);
    });
    return c.json(user);
  })
  .post("/logout", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken === "string") {
      const user = await revokeSession(sessionToken);
      if (user) await new ActivityService(user).log({ action: "USER_LOGOUT" });
    }

    deleteCookie(c, SESSION_COOKIE_NAME);

    return c.json({ success: true });
  })
  .get("/me", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken !== "string") throw new UnauthorizedError("Not authenticated");

    const resolved = await resolveAuthenticatedSession(sessionToken);
    if (!resolved) throw new UnauthorizedError("Invalid or expired session");

    if (resolved.rotatedToken) {
      setCookie(c, SESSION_COOKIE_NAME, resolved.rotatedToken, sessionCookieOptions);
    }

    const currentUser = resolved.user;
    if (!currentUser) throw new NotFoundError("User");

    return c.json(await getSessionUser(currentUser));
  });
