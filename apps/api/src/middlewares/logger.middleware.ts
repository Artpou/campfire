import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

import { colors, logRequest } from "../helpers/logger.helper";

// Store request start times
const requestTimes = new WeakMap<Request, number>();

/**
 * Middleware pour logguer les requêtes et les erreurs de validation (400)
 */
export const requestLogger = async (c: Context, next: Next) => {
  requestTimes.set(c.req.raw, Date.now());

  await next();

  const duration = Date.now() - (requestTimes.get(c.req.raw) || Date.now());
  logRequest(c.req.method, c.req.url, c.res.status, duration, c.req.query());

  if (c.res.status === 400) {
    try {
      const body = (await c.res.clone().json()) as { error?: { issues?: unknown } };
      if (body?.error?.issues) {
        console.error(
          `${colors.orange}[VALIDATION]${colors.reset}`,
          JSON.stringify(body.error.issues, null, 2),
        );
      }
    } catch {
      // Évite de faire crasher le logger si le body n'est pas du JSON
    }
  }
};

/**
 * Gestionnaire d'erreurs global (500)
 */
export const errorHandler = (err: Error, c: Context) => {
  console.error(err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: err.message }, 500);
};
