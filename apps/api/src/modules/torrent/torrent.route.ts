import { Elysia, t } from "elysia";
import { authGuard } from "@/modules/auth/auth.guard";
import { IndexerManagerService } from "../indexer-manager/indexer-manager.service";
import { TorrentService } from "./torrent.service";

export const torrentRoutes = new Elysia({ prefix: "/torrents" })
  .use(authGuard())
  .get("/indexers", async ({ user }) => {
    const indexerManager = await new IndexerManagerService(user).getSelected();

    if (!indexerManager) throw new Error(`No indexer is configured for this user`);
    if (!indexerManager.apiKey) throw new Error(`No API key is configured for this indexer`);

    return new TorrentService(user).listIndexers(indexerManager);
  })
  .get(
    "/search",
    async ({ user, query }) => {
      const indexerManager = await new IndexerManagerService(user).getSelected();
      if (!indexerManager) throw new Error(`Indexer not found`);

      return new TorrentService(user).searchTorrents({
        q: query.q,
        t: query.t,
        year: query.year,
        indexer: indexerManager.name,
        indexerId: query.indexerId,
      });
    },
    {
      query: t.Object({
        q: t.String(),
        t: t.String(),
        year: t.Optional(t.String()),
        indexerId: t.Optional(t.String()),
      }),
    },
  );
