import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

import { logger } from "@/helpers/logger.helper";

export const errorHandler = (err: Error, c: Context) => {
  const tag = `${c.req.method} ${c.req.path}`;

  if (err instanceof HTTPException) {
    logger.error(tag, err.message);
    return err.getResponse();
  }
  logger.error(tag, err.message, err.stack);
  return c.json({ error: "Internal Server Error" }, 500);
};
