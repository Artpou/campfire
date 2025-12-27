import { recentlyViewedQuerySchema, trackMediaSchema } from "@basement/validators/media.validators";
import { Elysia } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { MediaService } from "./media.service";

export const mediaRoutes = new Elysia({ prefix: "/media" })
  .use(authGuard())
  .get(
    "/recently-viewed",
    ({ user, query }) => new MediaService(user).getRecentlyViewed(query.type, query.limit),
    {
      query: recentlyViewedQuerySchema,
    },
  )
  .post("/track", ({ user, body }) => new MediaService(user).track(body), {
    body: trackMediaSchema,
  });
