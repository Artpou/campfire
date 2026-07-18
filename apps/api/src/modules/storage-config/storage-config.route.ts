import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { timeout } from "hono/timeout";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { testStorageConfigDto, upsertStorageConfigDto } from "./storage-config.dto";
import { StorageConfigService } from "./storage-config.service";

const service = new StorageConfigService();

export const storageConfigRoutes = new Hono()
  .use("*", authGuard)
  .use("*", requireRole("admin"))
  .get("/", async (c) => {
    const config = await service.get();
    return c.json(config);
  })
  .put("/", zValidator("json", upsertStorageConfigDto), async (c) => {
    const result = await service.upsert(c.req.valid("json"));
    return c.json(result);
  })
  .delete("/", async (c) => {
    return c.json(await service.remove());
  })
  .post("/test", zValidator("json", testStorageConfigDto), timeout(5000), async (c) => {
    const result = await service.test(c.req.valid("json"));
    return c.json(result);
  })
  .get("/status", async (c) => {
    const { remoteStorageService } = await import("./remote-storage.service");
    const available = await remoteStorageService.isAvailable();
    return c.json({ available });
  });
