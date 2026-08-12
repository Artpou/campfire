import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import ms from "ms";

/**
 * Self-hosted: key by peer IP. Prefer X-Real-IP (set by your reverse proxy).
 * Avoid raw X-Forwarded-For as the sole key — clients can spoof it unless the proxy overwrites it.
 */
const keyGenerator = (c: Context) =>
  c.req.header("x-real-ip")?.trim() || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "local";

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

export const tmdbRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 60,
  message: { error: "Too many TMDB requests. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});

export const subtitleRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 30,
  message: { error: "Too many subtitle requests. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});
