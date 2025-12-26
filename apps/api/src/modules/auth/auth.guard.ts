import type { Elysia } from "elysia";
import { auth, type User } from "@/auth";
import { UnauthorizedError } from "./error";

export const authGuard = () => (app: Elysia) =>
  app.resolve(async ({ request }): Promise<{ user: User }> => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      throw new UnauthorizedError();
    }

    return { user: session.user };
  });
