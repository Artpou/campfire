import { Elysia, t } from "elysia";
import ms from "ms";

import { hashPassword, verifyPassword } from "@/auth/password.util";
import { createSession, deleteSession, validateSession } from "@/auth/session.util";
import { UserService } from "../user/user.service";

const SESSION_COOKIE_NAME = "session";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  maxAge: ms("7d") / 1000, // Convert to seconds
  path: "/",
  sameSite: "lax" as const,
};

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/has-owner", async () => {
    const userService = new UserService();
    const hasOwner = await userService.hasOwner();
    return { hasOwner };
  })
  .post(
    "/register",
    async ({ body, cookie }) => {
      const { username, password } = body;
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
      const sessionToken = await createSession(newUser.id);

      cookie[SESSION_COOKIE_NAME].set({
        value: sessionToken,
        ...cookieOptions,
      });

      return newUser;
    },
    {
      body: t.Object({
        username: t.String({ minLength: 3 }),
        password: t.String({ minLength: 8 }),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, cookie }) => {
      const { username, password } = body;

      const userService = new UserService();

      const existingUser = await userService.getFullUser(username);
      if (!existingUser) throw new Error("Invalid username or password");

      const isValid = verifyPassword(password, existingUser.password);
      if (!isValid) throw new Error("Invalid username or password");

      const sessionToken = await createSession(existingUser.id);

      cookie[SESSION_COOKIE_NAME].set({
        value: sessionToken,
        ...cookieOptions,
      });

      return await userService.getById(existingUser.id);
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    },
  )
  .post("/logout", async ({ cookie }) => {
    const sessionToken = cookie[SESSION_COOKIE_NAME].value;

    if (typeof sessionToken === "string") {
      await deleteSession(sessionToken);
    }

    cookie[SESSION_COOKIE_NAME].remove();

    return { success: true };
  })
  .get("/me", async ({ cookie }) => {
    const sessionToken = cookie[SESSION_COOKIE_NAME].value;

    if (typeof sessionToken !== "string") throw new Error("Not authenticated");

    const userId = await validateSession(sessionToken);
    if (!userId) throw new Error("Invalid or expired session");

    const currentUser = await new UserService().getById(userId);
    if (!currentUser) throw new Error("User not found");

    return currentUser;
  });
