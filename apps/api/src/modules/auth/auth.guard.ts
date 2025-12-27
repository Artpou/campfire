import type { Elysia } from "elysia";
import { validateSession } from "@/auth/session.util";
import { UserService } from "../user/user.service";
import { UnauthorizedError } from "./error";

const SESSION_COOKIE_NAME = "session";

export const authGuard = () => (app: Elysia) =>
  app.resolve(async ({ cookie }) => {
    const sessionToken = cookie[SESSION_COOKIE_NAME]?.value;

    if (typeof sessionToken !== "string") throw new UnauthorizedError();

    const userId = await validateSession(sessionToken);
    if (!userId) throw new UnauthorizedError();

    const currentUser = await new UserService().getById(userId);
    if (!currentUser) throw new UnauthorizedError();

    return { user: currentUser };
  });
