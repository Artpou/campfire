import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import ms from "ms";

import { hashPassword, verifyPassword } from "@/auth/password.util";
import { createSession, deleteSession, validateSession } from "@/auth/session.util";
import { IndexerManagerService } from "../indexer-manager/indexer-manager.service";
import { UserService } from "../user/user.service";
import { loginSchema, registerSchema } from "./auth.dto";

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
  .post("/register", zValidator("json", registerSchema), async (c) => {
    const { username, password } = c.req.valid("json");
    const userService = new UserService();

    // Check if owner exists
    const hasOwner = await userService.hasOwner();

    // If owner already exists, disable signup
    if (hasOwner) {
      throw new Error("Registration is closed. Contact an administrator.");
    }

    const existingUser = await userService.getByUsername(username);
    if (existingUser) throw new Error("Username already exists");

    // First user becomes owner
    const newUser = await userService.create({
      username,
      password: hashPassword(password),
      role: "owner",
    });

    if (!newUser) throw new Error("Failed to create user");
    const sessionToken = await createSession(newUser.id);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, cookieOptions);

    return c.json(newUser);
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { username, password } = c.req.valid("json");

    const userService = new UserService();

    const existingUser = await userService.getFullUser(username);
    if (!existingUser) throw new Error("Invalid username or password");

    const isValid = verifyPassword(password, existingUser.password);
    if (!isValid) throw new Error("Invalid username or password");

    const sessionToken = await createSession(existingUser.id);

    setCookie(c, SESSION_COOKIE_NAME, sessionToken, cookieOptions);

    const user = await userService.getById(existingUser.id);
    return c.json(user);
  })
  .post("/logout", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken === "string") {
      await deleteSession(sessionToken);
    }

    deleteCookie(c, SESSION_COOKIE_NAME);

    return c.json({ success: true });
  })
  .get("/me", async (c) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

    if (typeof sessionToken !== "string") throw new Error("Not authenticated");

    const userId = await validateSession(sessionToken);
    if (!userId) throw new Error("Invalid or expired session");

    const currentUser = await new UserService().getById(userId);
    if (!currentUser) throw new Error("User not found");

    const selectedIndexer = await new IndexerManagerService(currentUser).getSelected();

    return c.json({
      ...currentUser,
      sessionToken,
      selectedIndexer,
    });
  });

export type AuthRoutesType = typeof authRoutes;
