import { eq, inArray } from "drizzle-orm";

import { NotFoundError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { db } from "@/db/db";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { ROLE_LEVELS } from "@/modules/auth/role.guard";
import type { IndexerAdapter } from "@/modules/torrent/adapters/indexer.adapter";
import { JackettAdapter } from "@/modules/torrent/adapters/jackett.adapter";
import { ProwlarrAdapter } from "@/modules/torrent/adapters/prowlarr.adapter";
import { StremioAdapter } from "@/modules/torrent/adapters/stremio.adapter";
import type { Indexer, IndexerModule, IndexerModuleWithIndexers } from "./indexer.types";
import { module } from "./module.schema";
import { ensureSystemModules } from "./module.seed";
import { ModuleService } from "./module.service";
import { moduleToIndexer } from "./module-indexer.bridge";

type IndexerModuleDto = IndexerModule | IndexerModuleWithIndexers;

export class ModuleIndexerService extends IdentifiableService<IndexerModule> {
  private adapterCache = new Map<string, IndexerAdapter>();

  getAdapter(indexer: IndexerModule): IndexerAdapter {
    const cached = this.adapterCache.get(indexer.id);
    if (cached) return cached;

    let adapter: IndexerAdapter;
    if (indexer.indexerType === "prowlarr") {
      adapter = new ProwlarrAdapter(indexer);
    } else if (indexer.indexerType === "jackett") {
      adapter = new JackettAdapter(indexer);
    } else {
      adapter = new StremioAdapter(indexer);
    }

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
    await ensureSystemModules();
    const rows = await db
      .select()
      .from(module)
      .where(ids ? inArray(module.id, ids) : eq(module.category, "indexer"));

    return rows
      .filter((row) => row.category === "indexer")
      .map((row) => {
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

  async get(id: string): Promise<IndexerModuleWithIndexers> {
    const indexers = await this.getMany({ ids: [id], withIndexers: true });
    if (!indexers[0]) throw new NotFoundError("Indexer module not found");
    return indexers[0];
  }

  async count(): Promise<number> {
    const indexers = await this.loadIndexers();
    return indexers.length;
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await this.loadIndexers([id]);
    if (!existing[0]) throw new NotFoundError("Indexer module not found");
    await new ModuleService(this.user).delete(id);
    this.adapterCache.delete(id);
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "INDEXER_DELETE",
      title: `Indexer removed: ${existing[0].indexerType}`,
      metadata: { moduleId: id, indexerType: existing[0].indexerType },
    });
    return { success: true };
  }
}
