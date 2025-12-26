import { createIndexerSchema, updateIndexerSchema } from "@basement/validators/indexer.validators";
import { Elysia, status, t } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { indexerService } from "./indexer.service";

export const indexerRoutes = new Elysia({ prefix: "/indexers" })
  .use(authGuard())
  .get("/", async ({ user }) => indexerService.getUserIndexers(user.id))
  .post("/", async ({ user, body }) => indexerService.upsert({ userId: user.id, ...body }), {
    body: createIndexerSchema,
  })
  .put(
    "/:id",
    async ({ params, body }) => {
      const indexer = await indexerService.update(params.id, body);
      if (!indexer) return status(404, "Indexer not found");
      return indexer;
    },
    { params: t.Object({ id: t.String() }), body: updateIndexerSchema },
  )
  .delete("/:id", async ({ params }) => indexerService.delete(params.id), {
    params: t.Object({ id: t.String() }),
  });
