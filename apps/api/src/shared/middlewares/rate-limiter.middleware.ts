import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import ms from "ms";

import { logger } from "@/shared/helpers/logger.helper";

/**
 * Self-hosted: key by peer IP.
 * Prefer X-Real-IP (then first X-Forwarded-For hop) when TRUST_PROXY=1.
 * Never trust client forwarded headers without a trusted proxy.
 * Fall back to the TCP peer address when the Node adapter exposes it; otherwise
 * all clients share one bucket — set TRUST_PROXY=1 behind a reverse proxy.
 */
let warnedMissingTrustProxy = false;

const keyGenerator = (c: Context) => {
  if (process.env.TRUST_PROXY === "1") {
    const realIp = c.req.header("x-real-ip")?.trim();
    if (realIp) return realIp;
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
  } else if (process.env.NODE_ENV === "production" && !warnedMissingTrustProxy) {
    warnedMissingTrustProxy = true;
    logger.warn(
      "RATE_LIMIT",
      "TRUST_PROXY is not set — rate limits may share one bucket behind a reverse proxy. Set TRUST_PROXY=1 and send X-Real-IP.",
    );
  }

  const peer = (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket
    ?.remoteAddress;
  return peer?.trim() || "local";
};

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

export const streamingRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 120,
  message: { error: "Too many streaming requests. Please try again in 1 minute." },
  statusCode: 429,
  keyGenerator,
});

export const fileTokenRateLimiter = rateLimiter({
  windowMs: Math.floor(ms("1m")),
  limit: 30,
  message: { error: "Too many file token requests. Please try again in 1 minute." },
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
