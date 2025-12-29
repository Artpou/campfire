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
  .post(
    "/register",
    async ({ body, cookie }) => {
      const { username, password } = body;
      const userService = new UserService();

      const existingUser = await userService.getByUsername(username);
      if (existingUser) throw new Error("Username already exists");

      const newUser = await userService.create({ username, password: hashPassword(password) });
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
