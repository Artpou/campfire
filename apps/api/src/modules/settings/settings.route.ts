import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { upsertSettingsDto } from "./settings.dto";
import { SettingsService } from "./settings.service";
import { invalidateTmdbKeyCache } from "./tmdb-key.helper";

const service = new SettingsService();

export const settingsRoutes = new Hono()
  .use("*", authGuard)
  .get("/tmdb-key-status", async (c) => {
    const configured = await service.isTmdbKeyConfigured();
    return c.json({ configured });
  })
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    const result = await service.get();
    return c.json(result);
  })
  .put("/", zValidator("json", upsertSettingsDto), async (c) => {
    const result = await service.upsert(c.req.valid("json"));
    invalidateTmdbKeyCache();
    return c.json(result);
  });
