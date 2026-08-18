import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { timeout } from "hono/timeout";

const DEFAULT_TIMEOUT_MS = 30_000;

/** Streaming + long batch jobs that routinely exceed 30s. */
const TIMEOUT_EXEMPT_PREFIXES = ["/streaming/", "/users/me/letterboxd/", "/modules/storage/sync"] as const;

const timed = timeout(DEFAULT_TIMEOUT_MS, () => {
  return new HTTPException(504, { message: "Server took too long to respond" });
});

/** 30s timeout on all routes except streaming and long-running sync/import jobs. */
export const requestTimeout = async (c: Context, next: Next) => {
  if (TIMEOUT_EXEMPT_PREFIXES.some((prefix) => c.req.path.startsWith(prefix))) {
    await next();
    return;
  }
  return timed(c, next);
};
