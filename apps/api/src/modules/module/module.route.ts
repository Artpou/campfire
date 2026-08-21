import { zValidator } from "@hono/zod-validator";
import { createModuleDto, manualSyncDto, moduleIdParamDto, moduleTestDto, updateModuleDto } from "@seedarr/contracts";
import { MODULE_CATALOG } from "@seedarr/shared";
import { timeout } from "hono/timeout";

import { addonActionFromPatch } from "@/modules/activity/activity.helper";
import { trackRoute } from "@/modules/activity/activity.service";
import { requireRole } from "@/modules/auth/role.guard";
import { ModuleIndexerService } from "./indexer/module-indexer.service";
import { ModuleService } from "./module.service";

export const moduleRoutes = ModuleService.createRouter()
  .use("*", requireRole("member"))
  .get("/catalog", async (c) => c.json(MODULE_CATALOG))
  .get("/", async (c) => c.json(await c.var.service.listAll()))
  .get("/indexers", async (c) => c.json(await new ModuleIndexerService(c.var.user).getMany({ withIndexers: true })))
  .get("/indexers/count", async (c) => c.json(await new ModuleIndexerService(c.var.user).count()))
  .get("/storage/enabled", async (c) => c.json({ enabled: await c.var.service.isStorageEnabled() }))
  .get("/:id/health", zValidator("param", moduleIdParamDto), async (c) =>
    c.json(await c.var.service.health(c.req.valid("param").id)),
  )
  .get("/:id", zValidator("param", moduleIdParamDto), async (c) =>
    c.json(await c.var.service.get(c.req.valid("param").id)),
  )
  .use("*", requireRole("admin"))
  .post("/", zValidator("json", createModuleDto), async (c) =>
    c.json(
      await trackRoute(
        c,
        {
          action: "ADDON_ENABLE",
          resolve: (created) => ({ moduleId: created.id }),
        },
        () => c.var.service.create(c.req.valid("json")),
      ),
      201,
    ),
  )
  .patch("/:id", zValidator("param", moduleIdParamDto), zValidator("json", updateModuleDto), async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    return c.json(
      await trackRoute(
        c,
        {
          action: addonActionFromPatch(body.enabled),
          moduleId: id,
        },
        () => c.var.service.update(id, body),
      ),
    );
  })
  .post(
    "/:id/test",
    zValidator("param", moduleIdParamDto),
    zValidator("json", moduleTestDto),
    timeout(8000),
    async (c) => c.json(await c.var.service.test(c.req.valid("param").id, c.req.valid("json"))),
  )
  .delete("/:id", zValidator("param", moduleIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await trackRoute(c, { action: "ADDON_DISABLE" }, () => c.var.service.delete(id)));
  })
  .post("/storage/sync", async (c) => {
    const storage = (await c.var.service.listByCategory("storage")).find((row) => row.enabled);
    return c.json(
      await trackRoute(c, { action: "REMOTE_SYNC", moduleId: storage?.id }, () => c.var.service.runStorageSync()),
    );
  })
  .post("/storage/sync-manual", zValidator("json", manualSyncDto), async (c) => {
    const body = c.req.valid("json");
    const storage = (await c.var.service.listByCategory("storage")).find((row) => row.enabled);
    return c.json(
      await trackRoute(
        c,
        {
          action: "REMOTE_SYNC",
          mediaId: body.mediaId,
          moduleId: storage?.id,
        },
        () => c.var.service.runStorageManualSync(body),
      ),
    );
  })
  .post("/storage/disconnect", async (c) => {
    const storage = (await c.var.service.listByCategory("storage"))[0];
    return c.json(
      await trackRoute(c, { action: "ADDON_DISABLE", moduleId: storage?.id }, () => c.var.service.disconnectStorage()),
    );
  });
