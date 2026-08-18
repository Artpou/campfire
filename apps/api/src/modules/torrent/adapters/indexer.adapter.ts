import type { TorrentListQuery } from "@seedarr/contracts";

import { BadRequestError, ServiceUnavailableError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import type { Indexer, IndexerModule } from "@/modules/module/indexer.types";
import type { Torrent } from "@/modules/torrent/torrent.types";

export abstract class IndexerAdapter {
  readonly indexerManager: IndexerModule;

  constructor(indexerManager: IndexerModule | undefined, indexerType: IndexerModule["indexerType"]) {
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
  abstract getTorrents(query: TorrentListQuery): Promise<Torrent[]>;
}
