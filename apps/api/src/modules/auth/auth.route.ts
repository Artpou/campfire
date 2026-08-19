import { zValidator } from "@hono/zod-validator";
import { loginDto, registerDto } from "@seedarr/contracts";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { NotFoundError, UnauthorizedError } from "@/shared/errors/error";
import { authRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/auth/auth.constants";
import { hashPassword, verifyPassword } from "@/auth/password.util";
import { createSession, deleteOtherSessions, deleteSession, resolveAuthenticatedSession } from "@/auth/session.util";
import { ActivityService, trackRoute } from "@/modules/activity/activity.service";
import { ModuleIndexerService } from "@/modules/module/module-indexer.service";
import { UserService } from "../user/user.service";
import type { AuthUser } from "./auth.types";

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
      const existingUser = await userService.getFullUser(username);
      if (!existingUser) throw new UnauthorizedError("Invalid username or password");

      const isValid = verifyPassword(password, existingUser.password);
      if (!isValid) throw new UnauthorizedError("Invalid username or password");

      const sessionToken = await createSession(existingUser.id);
      await deleteOtherSessions(existingUser.id, sessionToken);
      setCookie(c, SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions);
      return userService.get(existingUser.id);
    });
    return c.json(user);
  })
  .post("/logout", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken === "string") {
      const resolved = await resolveAuthenticatedSession(sessionToken);
      await deleteSession(sessionToken);
      if (resolved) await new ActivityService(resolved.user).log({ action: "USER_LOGOUT" });
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

    const countIndexerManagers = await new ModuleIndexerService(currentUser).count();

    const user: AuthUser = {
      ...currentUser,
      countIndexerManagers,
    };

    return c.json(user);
  });
