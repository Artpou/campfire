import { createSelectSchema } from "drizzle-typebox";
import { Elysia, t } from "elysia";

import { media } from "@/db/schema";
import { authGuard } from "@/modules/auth/auth.guard";
import { MediaService } from "./media.service";
import { MediaHistoryService } from "./media-history.service";
import { MediaLikeService } from "./media-like.service";
import { MediaWatchListService } from "./media-watch-list.service";

const selectSchema = createSelectSchema(media);

export const mediaRoutes = new Elysia({ prefix: "/media" })
  .use(authGuard())
  .get("/:id", ({ user, params }) => new MediaService(user).get(params.id), {
    params: t.Object({
      id: t.Number(),
    }),
  })
  .get("/:id/status", ({ user, params }) => new MediaService(user).getMediaStatus(params.id), {
    params: t.Object({
      id: t.Number(),
    }),
  })
  .post(
    "/status/batch",
    ({ user, body }) => new MediaService(user).getMediaStatusBatch(body.mediaIds),
    {
      body: t.Object({
        mediaIds: t.Array(t.Number()),
      }),
    },
  )
  .get(
    "/recently-viewed",
    ({ user, query }) =>
      new MediaHistoryService(user).getRecentlyViewed(query.type, query.page, query.limit),
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("tv")])),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .get(
    "/like",
    ({ user, query }) => new MediaLikeService(user).getLiked(query.type, query.page, query.limit),
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("tv")])),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .get(
    "/watch-list",
    ({ user, query }) =>
      new MediaWatchListService(user).getWatchList(query.type, query.page, query.limit),
    {
      query: t.Object({
        type: t.Optional(t.Union([t.Literal("movie"), t.Literal("tv")])),
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .post("/track", ({ user, body }) => new MediaHistoryService(user).track(body), {
    body: selectSchema,
  })
  .post("/like", ({ user, body }) => new MediaLikeService(user).toggle(body), {
    body: selectSchema,
  })
  .post("/watch-list", ({ user, body }) => new MediaWatchListService(user).toggle(body), {
    body: selectSchema,
  });
