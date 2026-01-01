import { IndexerManagerService } from "@/modules/indexer-manager/indexer-manager.service";
import { AuthenticatedService } from "../../classes/authenticated-service";
import { type IndexerType, type Media } from "../../db/schema";
import type { IndexerAdapter, Torrent, TorrentIndexer } from "./adapters/base.adapter";
import { JackettAdapter } from "./adapters/jackett.adapter";
import { ProwlarrAdapter } from "./adapters/prowlarr.adapter";

export class TorrentService extends AuthenticatedService {
  private readonly adapters: Record<IndexerType, IndexerAdapter> = {
    jackett: new JackettAdapter(),
    prowlarr: new ProwlarrAdapter(),
  };

  private getAdapter(indexer: IndexerType): IndexerAdapter {
    return this.adapters[indexer];
  }

  async getIndexers(): Promise<TorrentIndexer[]> {
    const indexerConfig = await new IndexerManagerService(this.user).getSelected();

    if (!indexerConfig) throw new Error(`No indexer is configured for this user`);
    if (indexerConfig.apiKey === null) throw new Error(`No API key is configured for this indexer`);

    return this.getAdapter(indexerConfig.name).getIndexers(indexerConfig.apiKey);
  }

  async searchTorrents(media: Media, indexerId: string): Promise<Torrent[]> {
    const indexerConfig = await new IndexerManagerService(this.user).getSelected();

    if (!indexerConfig) throw new Error(`No indexer is configured for this user`);
    if (indexerConfig.apiKey === null) throw new Error(`No API key is configured for this indexer`);

    const apiKey = indexerConfig.apiKey;
    const year = media.release_date ? media.release_date.split("-")[0] : undefined;
    const categories = media.type === "movie" ? ["2000"] : ["5000"];

    const search = async (query: string) => {
      return await this.getAdapter(indexerConfig.name).search(
        {
          q: this.sanitizeQuery(query),
          t: media.type,
          indexerId,
          categories,
        },
        apiKey,
      );
    };

    let torrents = await search(`${media.original_title}.${year || ""}`);

    if (torrents.length === 0 && media.title && media.title !== media.original_title) {
      torrents = await search(`${media.title}.${year || ""}`);
    }

    if (torrents.length === 0) {
      torrents = await search(`${media.title}`);
    }

    return torrents;
  }

  private sanitizeQuery(query: string): string {
    return query
      .replace(/[:;|<>"/\\*?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
