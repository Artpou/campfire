import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import { logger, logRequest } from "../helpers/logger.helper";

const requestTimes = new WeakMap<Request, number>();

export const requestLogger = async (c: Context, next: Next) => {
  requestTimes.set(c.req.raw, Date.now());

  await next();

  const duration = Date.now() - (requestTimes.get(c.req.raw) || Date.now());
  logRequest(c.req.method, c.req.url, c.res.status, duration, c.req.query());

  if (c.res.status === 400) {
    try {
      const body = (await c.res.clone().json()) as { error?: { issues?: unknown } };
      if (body?.error?.issues) {
        logger.warn("VALIDATION", JSON.stringify(body.error.issues, null, 2));
      }
    } catch {
      // body wasn't JSON
    }
  }
};

export const errorHandler = (err: Error, c: Context) => {
  const tag = `${c.req.method} ${c.req.path}`;

  if (err instanceof HTTPException) {
    logger.error(tag, err.message);
    return c.json({ error: err.message }, err.status);
  }
  logger.error(tag, err.message, err.stack);
  return c.json({ error: err.message }, 500);
};
