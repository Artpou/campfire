import { zValidator } from "@hono/zod-validator";
import { tmdbIdDto, tmdbListDto } from "@seedarr/contracts";
import { Hono } from "hono";

import { tmdbRateLimiter } from "@/shared/middlewares/rate-limiter.middleware";

import { authGuard, type HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { PersonService } from "./person.service";

export const personRoutes = new Hono<{ Variables: HonoAuthenticatedVariables & { service: PersonService } }>()
  .use(authGuard)
  .use("*", async (c, next) => {
    const user = c.get("user");
    const locale = c.req.query("locale") ?? "en-US";
    c.set("service", new PersonService(user, locale));
    await next();
  })
  .use(tmdbRateLimiter)
  .get("/:id", zValidator("param", tmdbIdDto), zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.get(c.req.param("id")));
  });
