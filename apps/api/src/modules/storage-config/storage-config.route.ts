import { zValidator } from "@hono/zod-validator";
import { manualSyncDto, testStorageConfigDto, upsertStorageConfigDto } from "@seedarr/contracts";
import { Hono } from "hono";
import { timeout } from "hono/timeout";

import { authGuard, type HonoAuthenticatedVariables } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { invalidateStorageConfigCache } from "./remote-storage.service";
import { runManualSync, runRemoteSync } from "./remote-sync.service";
import { StorageConfigService } from "./storage-config.service";

const service = new StorageConfigService();

export const storageConfigRoutes = new Hono<{ Variables: HonoAuthenticatedVariables }>()
  .use("*", authGuard)
  .get("/enabled", async (c) => {
    const { remoteStorageService } = await import("./remote-storage.service");
    return c.json({ enabled: await remoteStorageService.isEnabled() });
  })
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    const config = await service.get();
    return c.json(config);
  })
  .put("/", zValidator("json", upsertStorageConfigDto), async (c) => {
    const result = await service.upsert(c.req.valid("json"));
    invalidateStorageConfigCache();
    return c.json(result);
  })
  .delete("/", async (c) => {
    const result = await service.remove();
    invalidateStorageConfigCache();
    return c.json(result);
  })
  .post("/disconnect", async (c) => {
    const result = await service.disconnect();
    invalidateStorageConfigCache();
    return c.json(result);
  })
  .post("/test", zValidator("json", testStorageConfigDto), timeout(5000), async (c) => {
    const result = await service.test(c.req.valid("json"));
    return c.json(result);
  })
  .get("/status", async (c) => {
    const { remoteStorageService } = await import("./remote-storage.service");
    const available = await remoteStorageService.isAvailable();
    return c.json({ available });
  })
  .post("/sync", async (c) => {
    const user = c.get("user");
    const result = await runRemoteSync(user.id);
    return c.json(result);
  })
  .post("/sync-manual", zValidator("json", manualSyncDto), async (c) => {
    const user = c.get("user");
    return c.json(await runManualSync(user.id, c.req.valid("json")));
  });
