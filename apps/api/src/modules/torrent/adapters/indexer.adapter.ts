import { BadRequestError, ServiceUnavailableError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import type { Torrent, torrentListQuery } from "@/modules/torrent/torrent.dto";
import type { Indexer, IndexerManager, IndexerType } from "@/types";

export abstract class IndexerAdapter {
  readonly indexerManager: IndexerManager;

  constructor(indexerManager: IndexerManager | undefined, indexerType: IndexerType) {
    if (!indexerManager) throw new BadRequestError("Indexer manager is required");
    if (indexerManager.disabled) throw new BadRequestError("Indexer manager is disabled");
    if (indexerManager.indexerType !== indexerType) throw new BadRequestError("Indexer manager is not a valid indexer");
    this.indexerManager = indexerManager;
  }

  async fetchApi(url: string, init?: RequestInit): Promise<unknown> {
    if (!this.indexerManager.indexerUrl) throw new BadRequestError("Indexer URL is required");

    const baseUrl = this.indexerManager.indexerUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/${url}`, init);

    logger.debug(this.indexerManager.indexerType, `GET ${`${baseUrl}/${url}`}`);

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new ServiceUnavailableError(`Stremio (${response.status} ${response.statusText})`);
    }
    return await response.json();
  }
  abstract getIndexers(): Promise<Indexer[]>;
  abstract getTorrents(query: torrentListQuery): Promise<Torrent[]>;
}
