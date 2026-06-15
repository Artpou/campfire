import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { BadRequestError, ConflictError, NotFoundError } from "@/errors/error";
import { logger } from "@/helpers/logger.helper";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { indexer, indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import { JackettAdapter } from "@/modules/torrent/adapters/jackett.adapter";
import { ProwlarrAdapter } from "@/modules/torrent/adapters/prowlarr.adapter";
import {
  type CreateIndexerManagerInput,
  type Indexer,
  type IndexerManagerWithIndexers,
  TORRENTIO_ALL_PROVIDERS,
  TORRENTIO_BASE_URL,
  type UpdateIndexerManagerInput,
} from "./indexer-manager.dto";

const prowlarrAdapter = new ProwlarrAdapter();
const jackettAdapter = new JackettAdapter();

function buildTorrentioIndexer(providerName: string, managerId: string): typeof indexer.$inferInsert {
  const provider = TORRENTIO_ALL_PROVIDERS.find((p) => p.value === providerName);
  if (!provider) throw new BadRequestError(`Unknown Torrentio provider: ${providerName}`);
  return {
    indexerManagerId: managerId,
    name: provider.value,
    label: provider.label,
    lang: provider.lang,
    privacy: provider.privacy as "public" | "semi-private" | "private",
    description: "description" in provider ? (provider.description ?? null) : null,
  };
}

export class IndexerManagerService extends IdentifiableService<IndexerManagerWithIndexers> {
  private async enrichWithIndexers(
    manager: typeof indexerManager.$inferSelect & { indexers?: Indexer[] },
  ): Promise<IndexerManagerWithIndexers> {
    if (manager.indexerType === "torrentio") {
      return { ...manager, indexers: manager.indexers ?? [] };
    }

    try {
      const adapter = manager.indexerType === "prowlarr" ? prowlarrAdapter : jackettAdapter;
      const liveIndexers = await adapter.getIndexers({
        apiKey: manager.indexerApiKey ?? "",
        baseUrl: manager.indexerUrl ?? "",
      });
      return {
        ...manager,
        indexers: liveIndexers.map((li) => ({
          id: li.id,
          indexerManagerId: manager.id,
          name: li.name,
          label: li.label ?? li.name,
          lang: li.lang ?? null,
          privacy: li.privacy,
          description: li.description ?? null,
        })),
      };
    } catch (error) {
      logger.warn("INDEXER_MANAGER", `Failed to fetch indexers for ${manager.indexerType} (${manager.id}): ${error}`);
      return { ...manager, indexers: [] };
    }
  }

  async getMany(): Promise<IndexerManagerWithIndexers[]> {
    const managers = await db.query.indexerManager.findMany({ with: { indexers: true } });
    return Promise.all(managers.map((m) => this.enrichWithIndexers(m)));
  }

  async getManyBasic(): Promise<IndexerManagerWithIndexers[]> {
    const managers = await db.query.indexerManager.findMany({ with: { indexers: true } });
    return managers.map((m) => ({ ...m, indexers: m.indexers ?? [] }));
  }

  async get(id: string): Promise<IndexerManagerWithIndexers | undefined> {
    const manager = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
      with: { indexers: true },
    });
    if (!manager) return undefined;
    return this.enrichWithIndexers(manager);
  }

  async create(data: CreateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    if (data.indexerType === "torrentio") {
      const existing = await db.query.indexerManager.findFirst({
        where: eq(indexerManager.indexerType, "torrentio"),
      });
      if (existing) throw new ConflictError("Only one Torrentio instance is allowed");

      const [created] = await db
        .insert(indexerManager)
        .values({ indexerType: "torrentio", indexerUrl: TORRENTIO_BASE_URL })
        .returning();

      const providers = data.providers ?? [];
      if (providers.length > 0) {
        await db.insert(indexer).values(providers.map((p) => buildTorrentioIndexer(p, created.id)));
      }

      const result = await this.get(created.id);
      return result!;
    }

    if (!data.indexerUrl || !data.indexerApiKey) {
      throw new BadRequestError("indexerUrl and indexerApiKey are required");
    }

    const [created] = await db
      .insert(indexerManager)
      .values({
        indexerType: data.indexerType,
        indexerUrl: data.indexerUrl,
        indexerApiKey: data.indexerApiKey,
      })
      .returning();

    const result = await this.get(created.id);
    return result!;
  }

  async update(id: string, data: UpdateIndexerManagerInput): Promise<IndexerManagerWithIndexers> {
    const existing = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, id),
      with: { indexers: true },
    });
    if (!existing) throw new NotFoundError("IndexerManager");

    const updateData: Partial<typeof indexerManager.$inferInsert> = {};

    if (existing.indexerType === "torrentio") {
      if (data.providers) {
        const currentNames = new Set(existing.indexers.map((i) => i.name));
        const targetNames = new Set(data.providers);

        const toAdd = data.providers.filter((p) => !currentNames.has(p));
        const toRemove = existing.indexers.filter((i) => !targetNames.has(i.name));

        if (toRemove.length > 0) {
          for (const item of toRemove) {
            await db.delete(indexer).where(eq(indexer.id, item.id));
          }
        }
        if (toAdd.length > 0) {
          await db.insert(indexer).values(toAdd.map((p) => buildTorrentioIndexer(p, id)));
        }
      }
    } else {
      if (data.indexerUrl) updateData.indexerUrl = data.indexerUrl;
      if (data.indexerApiKey) updateData.indexerApiKey = data.indexerApiKey;
    }

    if (data.disabled !== undefined) updateData.disabled = data.disabled;

    if (Object.keys(updateData).length > 0) {
      await db.update(indexerManager).set(updateData).where(eq(indexerManager.id, id));
    }

    const result = await this.get(id);
    return result!;
  }

  async remove(id: string): Promise<{ success: true }> {
    const existing = await db.query.indexerManager.findFirst({ where: eq(indexerManager.id, id) });
    if (!existing) throw new NotFoundError("IndexerManager");
    await db.delete(indexerManager).where(eq(indexerManager.id, id));
    return { success: true };
  }

  async removeIndexer(managerId: string, indexerId: string): Promise<IndexerManagerWithIndexers> {
    const manager = await db.query.indexerManager.findFirst({
      where: eq(indexerManager.id, managerId),
      with: { indexers: true },
    });
    if (!manager) throw new NotFoundError("IndexerManager");
    if (manager.indexerType !== "torrentio") {
      throw new BadRequestError("Only Torrentio indexers can be deleted individually");
    }

    const target = manager.indexers.find((i) => i.id === indexerId);
    if (!target) throw new NotFoundError("Indexer");

    await db.delete(indexer).where(eq(indexer.id, indexerId));

    const result = await this.get(managerId);
    if (!result) throw new NotFoundError("IndexerManager");
    return result;
  }
}
