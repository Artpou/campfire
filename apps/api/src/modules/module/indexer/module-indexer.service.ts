import { NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import type { IndexerAdapter } from "@/modules/torrent/adapters/indexer.adapter";
import { moduleRepository } from "../module.repository";
import { createIndexerAdapter } from "./module-indexer.adapter";
import { moduleToIndexer } from "./module-indexer.bridge";
import type { Indexer, IndexerModule, IndexerModuleWithIndexers } from "./module-indexer.types";

type IndexerModuleDto = IndexerModule | IndexerModuleWithIndexers;

export class ModuleIndexerService extends IdentifiableService<IndexerModule> {
  private adapterCache = new Map<string, IndexerAdapter>();

  getAdapter(indexer: IndexerModule): IndexerAdapter {
    const cached = this.adapterCache.get(indexer.id);
    if (cached) return cached;
    const adapter = createIndexerAdapter(indexer);
    this.adapterCache.set(indexer.id, adapter);
    return adapter;
  }

  private async addIndexers(indexer: IndexerModule): Promise<IndexerModuleWithIndexers> {
    let indexers: Indexer[] = [];
    if (indexer.disabled) return { ...indexer, indexers };

    const adapter = this.getAdapter(indexer);
    try {
      indexers = await adapter.getIndexers();
    } catch (error) {
      logger.error(adapter.indexerManager.indexerType, "failed to get indexers", error);
    }
    return { ...indexer, indexers };
  }

  private async loadIndexers(ids?: string[]): Promise<IndexerModule[]> {
    let rows = await moduleRepository.listByCategory("indexer");
    if (ids?.length) rows = rows.filter((row) => ids.includes(row.id));

    return rows.map((row) => {
      const indexer = moduleToIndexer(row);
      if (this.roleLevel < ROLE_LEVELS.admin) indexer.indexerApiKey = "";
      return indexer;
    });
  }

  async getMany(options: { ids?: string[]; withIndexers: true }): Promise<IndexerModuleWithIndexers[]>;
  async getMany(options: { ids?: string[]; withIndexers?: false }): Promise<IndexerModule[]>;
  async getMany(options: { ids?: string[]; withIndexers?: boolean }): Promise<IndexerModuleDto[]> {
    const indexers = await this.loadIndexers(options.ids);
    if (!options.withIndexers) return indexers;
    return await Promise.all(indexers.map((indexer) => this.addIndexers(indexer)));
  }

  /** Settings UI — includes live indexer probe. */
  async get(id: string): Promise<IndexerModuleWithIndexers> {
    const indexers = await this.getMany({ ids: [id], withIndexers: true });
    if (!indexers[0]) throw new NotFoundError("Indexer module not found");
    return indexers[0];
  }

  async count(): Promise<number> {
    return (await this.loadIndexers()).length;
  }
}
