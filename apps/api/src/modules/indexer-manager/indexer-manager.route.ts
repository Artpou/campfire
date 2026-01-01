import { createIndexerManagerSchema } from "@basement/validators/indexerManager.validators";
import { Elysia } from "elysia";

import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = new Elysia({ prefix: "/indexerManagers" })
  .use(authGuard())
  .use(requireRole("member"))
  .get("/", async ({ user }) => {
    const service = new IndexerManagerService(user);
    return await service.list();
  })
  .post(
    "/",
    async ({ body, user }) => {
      const service = new IndexerManagerService(user);
      return await service.create(body);
    },
    {
      body: createIndexerManagerSchema,
    },
  );
