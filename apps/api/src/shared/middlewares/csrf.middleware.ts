import type { Context, Next } from "hono";

import { ForbiddenError } from "@/shared/errors/error";

const MUTATING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Validates Origin header on state-changing requests when present.
 * SameSite=Lax cookies provide baseline CSRF protection; this blocks cross-origin
 * mutations from browsers that send an Origin header (typical CSRF attack vector).
 */
export const csrfGuard = async (c: Context, next: Next): Promise<void> => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next();
    return;
  }

  const origin = c.req.header("origin");
  const allowedOrigin = process.env.WEB_URL;

  if (origin && allowedOrigin && origin !== allowedOrigin) {
    throw new ForbiddenError("CSRF validation failed");
  }

  await next();
};
