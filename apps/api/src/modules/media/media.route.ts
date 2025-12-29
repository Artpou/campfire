import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";

import { media } from "@/db/schema";
import { authGuard } from "@/modules/auth/auth.guard";
import { MediaService } from "./media.service";

const selectSchema = createSelectSchema(media);

export const mediaRoutes = new Elysia({ prefix: "/media" })
  .use(authGuard())
  .get("/:id", ({ user, params }) => new MediaService(user).get(params.id), {
    params: t.Object({
      id: t.Number(),
    }),
  })
  .get(
    "/recently-viewed",
    ({ user, query }) => new MediaService(user).getRecentlyViewed(query.type, query.limit),
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("tv")])),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .post("/track", ({ user, body }) => new MediaService(user).track(body), {
    body: selectSchema,
  });
