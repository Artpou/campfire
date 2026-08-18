import { zValidator } from "@hono/zod-validator";
import { createModuleDto, manualSyncDto, moduleIdParamDto, moduleTestDto, updateModuleDto } from "@seedarr/contracts";
import { MODULE_CATALOG } from "@seedarr/shared";
import { timeout } from "hono/timeout";

import { requireRole } from "@/modules/auth/role.guard";
import { invalidateStorageConfigCache } from "@/modules/storage-config/remote/remote-storage.service";
import { runManualSync, runRemoteSync } from "@/modules/storage-config/remote/remote-sync.service";
import { ModuleService } from "./module.service";
import { ModuleIndexerService } from "./module-indexer.service";

export const moduleRoutes = ModuleService.createRouter()
  .use("*", requireRole("member"))
  .get("/catalog", async (c) => c.json(MODULE_CATALOG))
  .get("/", async (c) => c.json(await c.var.service.list()))
  .get("/indexers", async (c) => c.json(await new ModuleIndexerService(c.var.user).getMany({ withIndexers: true })))
  .get("/indexers/count", async (c) => c.json(await new ModuleIndexerService(c.var.user).count()))
  .get("/storage/enabled", async (c) => {
    const { remoteStorageService } = await import("@/modules/storage-config/remote/remote-storage.service");
    return c.json({ enabled: await remoteStorageService.isEnabled() });
  })
  .get("/:id/health", zValidator("param", moduleIdParamDto), async (c) =>
    c.json(await c.var.service.health(c.req.valid("param").id)),
  )
  .get("/:id", zValidator("param", moduleIdParamDto), async (c) =>
    c.json(await c.var.service.get(c.req.valid("param").id)),
  )
  .use("*", requireRole("admin"))
  .post("/", zValidator("json", createModuleDto), async (c) =>
    c.json(await c.var.service.create(c.req.valid("json")), 201),
  )
  .patch("/:id", zValidator("param", moduleIdParamDto), zValidator("json", updateModuleDto), async (c) =>
    c.json(await c.var.service.update(c.req.valid("param").id, c.req.valid("json"))),
  )
  .post(
    "/:id/test",
    zValidator("param", moduleIdParamDto),
    zValidator("json", moduleTestDto),
    timeout(8000),
    async (c) => c.json(await c.var.service.test(c.req.valid("param").id, c.req.valid("json"))),
  )
  .delete("/:id", zValidator("param", moduleIdParamDto), async (c) =>
    c.json(await c.var.service.delete(c.req.valid("param").id)),
  )
  .post("/storage/sync", async (c) => {
    const user = c.var.user;
    return c.json(await runRemoteSync(user.id));
  })
  .post("/storage/sync-manual", zValidator("json", manualSyncDto), async (c) => {
    const user = c.var.user;
    return c.json(await runManualSync(user.id, c.req.valid("json")));
  })
  .post("/storage/disconnect", async (c) => {
    const rows = await c.var.service.listByCategory("storage");
    const row = rows[0];
    if (!row) return c.json({ ok: true });
    await c.var.service.update(row.id, { enabled: false });
    invalidateStorageConfigCache();
    return c.json({ ok: true });
  });
