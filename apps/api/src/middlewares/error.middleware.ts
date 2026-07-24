import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { logger } from "@/helpers/logger.helper";

export const errorHandler = (err: Error, c: Context) => {
  const tag = `${c.req.method} ${c.req.path}`;

  if (err instanceof HTTPException) {
    if (err.status !== 401) {
      logger.error(tag, err.message);
    }
    return err.getResponse();
  }

  if (err.name === "AbortError" || err.message?.includes("aborted")) {
    return c.body(null, 204);
  }

  logger.error(tag, err.message, err.stack);
  return c.json({ error: "Internal Server Error" }, 500);
};
