import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/auth/auth.constants";
import { hashPassword, verifyPassword } from "@/auth/password.util";
import { createSession, deleteOtherSessions, deleteSession, resolveAuthenticatedSession } from "@/auth/session.util";
import { NotFoundError, UnauthorizedError } from "@/errors/error";
import { authRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { createMediaToken } from "@/modules/auth/media-token.service";
import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { UserService } from "../user/user.service";
import { type AuthUser, loginDto, registerDto } from "./auth.dto";

export const authRoutes = new Hono()
  .get("/has-owner", async (c) => {
    const userService = new UserService();
    const hasOwner = await userService.hasOwner();
    return c.json({ hasOwner });
  })
  .post("/register", authRateLimiter, zValidator("json", registerDto), async (c) => {
    const { username, password } = c.req.valid("json");
    const userService = new UserService();

    const newUser = await userService.register(username, hashPassword(password));
    const sessionToken = await createSession(newUser.id);
    ActivityLogService.log({
      userId: newUser.id,
      type: "SUCCESS",
      action: "USER_CREATE",
      title: `${username} registered`,
    });

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
    return c.json(newUser);
  })
  .post("/login", authRateLimiter, zValidator("json", loginDto), async (c) => {
    const { username, password } = c.req.valid("json");

    const userService = new UserService();

    const existingUser = await userService.getFullUser(username);
    if (!existingUser) throw new UnauthorizedError("Invalid username or password");

    const isValid = verifyPassword(password, existingUser.password);
    if (!isValid) throw new UnauthorizedError("Invalid username or password");

    const sessionToken = await createSession(existingUser.id);
    await deleteOtherSessions(existingUser.id, sessionToken);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);

    const user = await userService.get(existingUser.id);
    ActivityLogService.log({
      userId: existingUser.id,
      type: "SUCCESS",
      action: "USER_LOGIN",
      title: `${username} logged in`,
    });
    return c.json(user);
  })
  .post("/logout", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken === "string") {
      const resolved = await resolveAuthenticatedSession(sessionToken);
      await deleteSession(sessionToken);
      if (resolved) {
        ActivityLogService.log({
          userId: resolved.user.id,
          type: "INFO",
          action: "USER_LOGOUT",
          title: "User logged out",
        });
      }
    }

    deleteCookie(c, SESSION_COOKIE_NAME);

    return c.json({ success: true });
  })
  .get("/media-session", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
    if (typeof sessionToken !== "string") throw new UnauthorizedError("Not authenticated");
    const resolved = await resolveAuthenticatedSession(sessionToken);
    if (!resolved) throw new UnauthorizedError("Invalid session");
    const token = await createMediaToken(resolved.user.id);
    return c.json({ token });
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

    const countIndexerManagers = await new IndexerManagerService(currentUser).count();

    const user: AuthUser = {
      ...currentUser,
      countIndexerManagers,
    };

    return c.json(user);
  });
