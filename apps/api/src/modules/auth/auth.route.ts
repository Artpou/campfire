import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import ms from "ms";

import { hashPassword, verifyPassword } from "@/auth/password.util";
import { createSession, deleteSession, validateSession } from "@/auth/session.util";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/errors/error";
import { authRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { ActivityLogService } from "../activity-log/activity-log.service";
import { IndexerManagerService } from "../indexer-manager/indexer-manager.service";
import { UserService } from "../user/user.service";
import { loginDto, registerDto } from "./auth.dto";

const SESSION_COOKIE_NAME = "session";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  maxAge: Math.floor(ms("7d") / 1000), // Convert to seconds
  path: "/",
  sameSite: "lax" as const,
};

export const authRoutes = new Hono()
  .get("/has-owner", async (c) => {
    const userService = new UserService();
    const hasOwner = await userService.hasOwner();
    return c.json({ hasOwner });
  })
  .post("/register", authRateLimiter, zValidator("json", registerDto), async (c) => {
    const { username, password } = c.req.valid("json");
    const userService = new UserService();

    const hasOwner = await userService.hasOwner();
    if (hasOwner) throw new ForbiddenError("Registration is closed. Contact an administrator.");

    const newUser = await userService.register(username, hashPassword(password));
    const sessionToken = await createSession(newUser.id);
    ActivityLogService.log({
      userId: newUser.id,
      type: "SUCCESS",
      action: "USER_CREATE",
      title: `${username} registered`,
    });

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, cookieOptions);
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

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, cookieOptions);

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
      const userId = await validateSession(sessionToken);
      await deleteSession(sessionToken);
      if (userId) ActivityLogService.log({ userId, type: "INFO", action: "USER_LOGOUT", title: "User logged out" });
    }

    deleteCookie(c, SESSION_COOKIE_NAME);

    return c.json({ success: true });
  })
  .get("/media-session", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
    if (typeof sessionToken !== "string") throw new UnauthorizedError("Not authenticated");
    return c.json({ session: sessionToken });
  })
  .get("/me", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken !== "string") throw new UnauthorizedError("Not authenticated");

    const userId = await validateSession(sessionToken);
    if (!userId) throw new UnauthorizedError("Invalid or expired session");

    const currentUser = await new UserService().get(userId);
    if (!currentUser) throw new NotFoundError("User");

    const indexerManagers = await new IndexerManagerService(currentUser).getManyBasic();

    return c.json({
      ...currentUser,
      indexerManagers,
    });
  });
