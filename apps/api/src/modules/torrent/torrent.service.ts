import { indexerService } from "@/modules/indexer/indexer.service";
import type { IndexerAdapter, Torrent, TorrentIndexer } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";

type IndexerType = "jackett" | "prowlarr";

export class TorrentService {
  private readonly adapters: Record<IndexerType, IndexerAdapter> = {
    jackett: new JackettAdapter(),
    prowlarr: new ProwlarrAdapter(),
  };

  private getAdapter(indexer: IndexerType): IndexerAdapter {
    return this.adapters[indexer];
  }

  async getIndexers(userId: string, indexer: IndexerType): Promise<TorrentIndexer[]> {
    const indexerConfig = await indexerService.getByName(indexer, userId);

    if (!indexerConfig) {
      throw new Error(`${indexer} is not configured for this user`);
    }

    return await this.getAdapter(indexer).getIndexers(indexerConfig.apiKey);
  }

  async searchTorrents(query: {
    userId: string;
    q: string;
    t: string;
    year?: string;
    indexer: IndexerType;
    indexerId?: string;
  }): Promise<{ recommended: Torrent[]; others: Torrent[] }> {
    const indexerConfig = await indexerService.getByName(query.indexer, query.userId);

    if (!indexerConfig) {
      throw new Error(`${query.indexer} is not configured for this user`);
    }

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

export const torrentService = new TorrentService();
