import { Elysia, t } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { torrentService } from "./torrent.service";

export const torrentRoutes = new Elysia({ prefix: "/torrents" })
  .use(authGuard())
  .get("/indexers", async ({ user, query }) => torrentService.getIndexers(user.id, query.indexer), {
    query: t.Object({
      indexer: t.Union([t.Literal("jackett"), t.Literal("prowlarr")]),
    }),
  })
  .get(
    "/search",
    async ({ user, query }) =>
      torrentService.searchTorrents({
        userId: user.id,
        q: query.q,
        t: query.t,
        year: query.year,
        indexer: query.indexer,
        indexerId: query.indexerId,
      }),
    {
      query: t.Object({
        q: t.String(),
        t: t.String(),
        year: t.Optional(t.String()),
        indexer: t.Union([t.Literal("jackett"), t.Literal("prowlarr")]),
        indexerId: t.Optional(t.String()),
      }),
    },
  );
