import { eq } from "drizzle-orm";

import { db } from "@/db/db";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { indexerManager } from "@/modules/indexer-manager/indexer-manager.schema";
import type { IndexerManager, UpsertIndexerManagerInput } from "./indexer-manager.dto";

// TODO: manage multiple indexers
export class IndexerManagerService extends IdentifiableService<IndexerManager> {
  async getMany(): Promise<IndexerManager[]> {
    return db.query.indexerManager.findMany();
  }

  async get(): Promise<IndexerManager | undefined> {
    return db.query.indexerManager.findFirst();
  }

  async upsert(data: UpsertIndexerManagerInput): Promise<IndexerManager> {
    const existing = (await this.getMany())?.[0];

    if (existing) {
      const [updated] = await db.update(indexerManager).set(data).where(eq(indexerManager.id, existing.id)).returning();
      return updated;
    }

    const [created] = await db.insert(indexerManager).values(data).returning();
    return created;
  }

  async delete(): Promise<{ success: true }> {
    await db.delete(indexerManager);
    return { success: true };
  }
}
