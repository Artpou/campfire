import { zValidator } from "@hono/zod-validator";
import { upsertSettingsDto } from "@seedarr/contracts";
import { Hono } from "hono";

import { ForbiddenError } from "@/shared/errors/error";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { SettingsService } from "./settings.service";
import { invalidateTmdbKeyCache } from "./tmdb-key.helper";

const service = new SettingsService();

export const settingsRoutes = new Hono()
  .use("*", authGuard)
  .get("/tmdb-key-status", async (c) => {
    const configured = await service.isTmdbKeyConfigured();
    return c.json({ configured });
  })
  .get("/ui", async (c) => {
    return c.json(await service.getUi());
  })
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    const result = await service.get();
    return c.json(result);
  })
  .put("/", zValidator("json", upsertSettingsDto), async (c) => {
    const input = c.req.valid("json");
    if (input.showMediaRatings !== undefined && c.get("user").role !== "owner") {
      throw new ForbiddenError("Only the owner can change media rating visibility");
    }
    const result = await service.upsert(input);
    invalidateTmdbKeyCache();
    return c.json(result);
  });
