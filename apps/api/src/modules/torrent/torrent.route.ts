import { Elysia, t } from "elysia";
import { torrentService } from "./torrent.service";

export const torrentRoutes = new Elysia({ prefix: "/torrents" })
  .get(
    "/indexers",
    async ({ query }) => {
      return await torrentService.getIndexers(
        query.indexer as "jackett" | "prowlarr",
        query.apiKey,
      );
    },
    {
      query: t.Object({
        indexer: t.Required(t.Union([t.Literal("jackett"), t.Literal("prowlarr")])),
        apiKey: t.Required(t.String()),
      }),
    },
  )
  .get(
    "/search",
    async ({ query }) => {
      console.log(query.indexer);
      return await torrentService.searchTorrents({
        q: query.q,
        t: query.t,
        year: query.year,
        indexer: query.indexer as "jackett" | "prowlarr",
        apiKey: query.apiKey,
        indexerId: query.indexerId,
      });
    },
    {
      query: t.Object({
        q: t.Required(t.String()),
        t: t.Required(t.String()),
        year: t.Optional(t.String()),
        indexer: t.Required(t.Union([t.Literal("jackett"), t.Literal("prowlarr")])),
        apiKey: t.Required(t.String()),
        indexerId: t.Optional(t.String()),
      }),
    },
  );
