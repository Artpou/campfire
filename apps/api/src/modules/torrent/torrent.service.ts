import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import { AuthenticatedService } from "../../classes/authenticated-service";
import { IndexerManager } from "../../db/schema";
import type { IndexerAdapter, Torrent, TorrentIndexer } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";

type IndexerType = "jackett" | "prowlarr";

export class TorrentService extends AuthenticatedService {
  private readonly adapters: Record<IndexerType, IndexerAdapter> = {
    jackett: new JackettAdapter(),
    prowlarr: new ProwlarrAdapter(),
  };

  private getAdapter(indexer: IndexerType): IndexerAdapter {
    return this.adapters[indexer];
  }

  async listIndexers(indexerManager: IndexerManager): Promise<TorrentIndexer[]> {
    return await this.getAdapter(indexerManager.name).getIndexers(indexerManager.apiKey || "");
  }

  async searchTorrents(query: {
    q: string;
    t: string;
    year?: string;
    indexer: IndexerType;
    indexerId?: string;
  }): Promise<{ recommended: Torrent[]; others: Torrent[] }> {
    const indexerConfig = await new IndexerManagerService(this.user).getByName(query.indexer);

    if (!indexerConfig) throw new Error(`${query.indexer} is not configured for this user`);
    if (!indexerConfig.apiKey) throw new Error(`No API key is configured for this indexer`);

    const sanitizedQuery = this.sanitizeQuery(query.q);

    const torrents = await this.getAdapter(query.indexer).search(
      { q: sanitizedQuery, t: query.t, indexerId: query.indexerId },
      indexerConfig.apiKey,
    );

    return this.sortAndFilterTorrents(torrents, query.year);
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/[:;|<>"/\\*?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private sortAndFilterTorrents(
    torrents: Torrent[],
    year?: string,
  ): { recommended: Torrent[]; others: Torrent[] } {
    torrents.sort((a, b) => b.seeders - a.seeders);

    if (year) {
      const recommended = torrents.filter((t) => t.title.includes(year));
      const others = torrents.filter((t) => !t.title.includes(year));
      return { recommended, others };
    }

    return { recommended: torrents, others: [] };
  }
}
