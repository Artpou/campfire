import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import type { HonoVariables } from "@/types/hono";
import { plexSyncSchema, updatePlexConfigSchema } from "./plex.dto";
import { PlexService } from "./plex.service";

export const plexRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .use("*", requireRole("admin"))
  .get("/config", async (c) => {
    return c.json(await PlexService.fromContext(c).getConfig());
  })
  .post("/config", zValidator("json", updatePlexConfigSchema), async (c) => {
    const body = c.req.valid("json");
    return c.json(await PlexService.fromContext(c).updateConfig(body));
  })
  .get("/servers", zValidator("query", z.object({ token: z.string() })), async (c) => {
    const { token } = c.req.valid("query");
    return c.json(await PlexService.fromContext(c).fetchServers(token));
  })
  .post("/sync", zValidator("json", plexSyncSchema), async (c) => {
    const body = c.req.valid("json");
    return c.json(await PlexService.fromContext(c).syncLibrary(body));
  });

export type PlexRoutesType = typeof plexRoutes;
