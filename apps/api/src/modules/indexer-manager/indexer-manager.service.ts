import { count, eq, inArray } from "drizzle-orm";

import { db } from "@/db/db";
import { NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import { IndexerAdapter } from "@/modules/torrent/adapters/indexer.adapter";
import { JackettAdapter } from "@/modules/torrent/adapters/jackett.adapter";
import { ProwlarrAdapter } from "@/modules/torrent/adapters/prowlarr.adapter";
import { StremioAdapter } from "@/modules/torrent/adapters/stremio.adapter";
import {
  type CreateIndexerManagerInput,
  Indexer,
  IndexerManager,
  IndexerManagerWithIndexers,
  type UpdateIndexerManagerInput,
} from "./indexer-manager.dto";

function buildStremioUrl(providers: string[]): string {
  return `https://torrentio.strem.fun/${providers.join(",")}`;
}

type IndexerManagerDto = IndexerManager | IndexerManagerWithIndexers;

export class IndexerManagerService extends IdentifiableService<IndexerManager> {
  private prowlarrAdapter?: ProwlarrAdapter;
  private jackettAdapter?: JackettAdapter;
  private stremioAdapter?: StremioAdapter;

  getAdapter(indexerManager: IndexerManager): IndexerAdapter {
    if (indexerManager.indexerType === "prowlarr") {
      if (!this.prowlarrAdapter) this.prowlarrAdapter = new ProwlarrAdapter(indexerManager);
      return this.prowlarrAdapter;
    } else if (indexerManager.indexerType === "jackett") {
      if (!this.jackettAdapter) this.jackettAdapter = new JackettAdapter(indexerManager);
      return this.jackettAdapter;
    }
    if (!this.stremioAdapter) this.stremioAdapter = new StremioAdapter(indexerManager);
    return this.stremioAdapter;
  }

  private async addIndexers(manager: IndexerManager): Promise<IndexerManagerWithIndexers> {
    let indexers: Indexer[] = [];
    if (manager.disabled) return { ...manager, indexers };

    const adapter = this.getAdapter(manager);

    try {
      indexers = await adapter.getIndexers();
    } catch (error) {
      logger.error(adapter.indexerManager.indexerType, "failed to get indexers", error);
    }
    return { ...manager, indexers };
  }

  async getMany(options: { ids?: string[]; withIndexers: true }): Promise<IndexerManagerWithIndexers[]>;
  async getMany(options: { ids?: string[]; withIndexers?: false }): Promise<IndexerManager[]>;
  async getMany(options: { ids?: string[]; withIndexers?: boolean }): Promise<IndexerManagerDto[]> {
    const managers = await db.query.indexerManager.findMany({
      where: options.ids ? inArray(indexerManager.id, options.ids) : undefined,
    });

    if (!options.withIndexers) return managers;

    return await Promise.all(managers.map((manager) => this.addIndexers(manager)));
  }

  async count(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(indexerManager);
    return result?.count ?? 0;
  }

  async get(id: string): Promise<IndexerManagerWithIndexers | undefined> {
    const managers = await this.getMany({ ids: [id], withIndexers: true });
    return managers[0];
  }

  async create(data: CreateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    const values: typeof indexerManager.$inferInsert = {
      indexerType: data.indexerType,
      indexerUrl: data.indexerUrl,
      indexerApiKey: data.indexerApiKey,
    };

    if (data.indexerType === "stremio" && data.providers?.length) {
      values.indexerUrl = buildStremioUrl(data.providers);
    }

    const [created] = await db.insert(indexerManager).values(values).returning();

    ActivityLogService.log({
      userId: this.user.id,
      type: "SUCCESS",
      action: "INDEXER_ADD",
      title: `Indexer added: ${data.indexerType}`,
      metadata: { indexerManagerId: created.id, indexerType: data.indexerType },
    });

    return this.addIndexers(created);
  }

  async update(id: string, data: UpdateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    const existing = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
    });
    if (!existing) throw new NotFoundError("IndexerManager");

    const updateData: Partial<typeof indexerManager.$inferInsert> = {};

    if (data.indexerUrl) updateData.indexerUrl = data.indexerUrl;
    if (data.indexerApiKey) updateData.indexerApiKey = data.indexerApiKey;
    if (data.disabled !== undefined) updateData.disabled = data.disabled;
    if (existing.indexerType === "stremio" && data.providers?.length) {
      updateData.indexerUrl = buildStremioUrl(data.providers);
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(indexerManager).set(updateData).where(eq(indexerManager.id, id));
    }

    const updated = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
    });
    if (!updated) throw new NotFoundError("IndexerManager");

    return this.addIndexers(updated);
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await db.query.indexerManager.findFirst({ where: eq(indexerManager.id, id) });
    if (!existing) throw new NotFoundError("IndexerManager");
    await db.delete(indexerManager).where(eq(indexerManager.id, id));
    ActivityLogService.log({
      userId: this.user.id,
      type: "INFO",
      action: "INDEXER_DELETE",
      title: `Indexer removed: ${existing.indexerType}`,
      metadata: { indexerManagerId: id },
    });
    return { success: true };
  }
}
