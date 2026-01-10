import { eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { type IndexerType, indexerManager } from "@/db/schema";
import type { IndexerManager, NewIndexerManager } from "./indexer-manager.dto";

type CreateIndexerManager = NewIndexerManager;

export class IndexerManagerService extends AuthenticatedService {
  private query = db.select().from(indexerManager);

  async list(): Promise<IndexerManager[]> {
    return await this.query;
  }

  async getSelected(): Promise<IndexerManager | null> {
    const [result] = await this.query.where(eq(indexerManager.selected, true)).limit(1);
    return result ?? null;
  }

  async getByName(name: IndexerType): Promise<IndexerManager | null> {
    const [result] = await this.query.where(eq(indexerManager.name, name)).limit(1);
    return result ?? null;
  }

  async create(data: NewIndexerManager): Promise<IndexerManager> {
    const [result] = await db.insert(indexerManager).values(data).returning();
    return result;
  }

  async select(name: IndexerType): Promise<void> {
    // Deselect all first
    await db.update(indexerManager).set({ selected: false });
    // Select the specified one
    await db.update(indexerManager).set({ selected: true }).where(eq(indexerManager.name, name));
  }

  async update(
    name: IndexerType,
    data: Partial<Omit<NewIndexerManager, "name">>,
  ): Promise<IndexerManager | null> {
    await db.update(indexerManager).set(data).where(eq(indexerManager.name, name));
    await this.select(name);
    return await this.getByName(name);
  }

  async delete(name: IndexerType): Promise<void> {
    await db.delete(indexerManager).where(eq(indexerManager.name, name));
  }

  async upsert(data: CreateIndexerManager): Promise<IndexerManager> {
    const updateData = Object.fromEntries(
      Object.entries({
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        selected: data.selected,
      }).filter(([_, value]) => value !== undefined),
    );

    const [result] = await db
      .insert(indexerManager)
      .values(data)
      .onConflictDoUpdate({
        target: indexerManager.name,
        set: updateData,
      })
      .returning();

    await this.select(result.name);
    return result;
  }
}
