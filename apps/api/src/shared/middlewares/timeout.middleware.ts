import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { timeout } from "hono/timeout";

const DEFAULT_TIMEOUT_MS = 30_000;

const timed = timeout(DEFAULT_TIMEOUT_MS, () => {
  return new HTTPException(504, { message: "Server took too long to respond" });
});

/** 30s timeout on all routes except long-lived streaming. */
export const requestTimeout = async (c: Context, next: Next) => {
  if (c.req.path.startsWith("/streaming/")) {
    await next();
    return;
  }
  return timed(c, next);
};
