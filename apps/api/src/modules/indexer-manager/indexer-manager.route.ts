import { createIndexerManagerSchema } from "@basement/validators/indexerManager.validators";
import { Elysia } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { IndexerManagerService } from "./indexer-manager.service";

export const indexerManagerRoutes = new Elysia({ prefix: "/indexerManagers" })
  .use(authGuard())
  .get("/", async ({ user }) => new IndexerManagerService(user).list())
  .post("/", async ({ user, body }) => new IndexerManagerService(user).upsert(body), {
    body: createIndexerManagerSchema,
  });
