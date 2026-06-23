import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import ms from "ms";

const keyGenerator = (c: Context) => c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "global";

export const authRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 20,
  message: { error: "Too many attempts. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});

export const torrentRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 30,
  message: { error: "Too many torrent requests. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});

export const downloadStartRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 10,
  message: { error: "Too many download requests. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});
