import { eq } from "drizzle-orm";

import { AuthenticatedService } from "@/classes/authenticated-service";
import { db } from "@/db/db";
import { indexerManager } from "@/db/schema";
import type { IndexerManager, UpsertIndexerManagerInput } from "./indexer-manager.dto";

export class IndexerManagerService extends AuthenticatedService {
  async get(): Promise<IndexerManager | null> {
    const [result] = await db.select().from(indexerManager).limit(1);
    return result ?? null;
  }

  async upsert(data: UpsertIndexerManagerInput): Promise<IndexerManager> {
    const existing = await this.get();

    if (existing) {
      const [updated] = await db
        .update(indexerManager)
        .set({
          indexerType: data.indexerType,
          indexerUrl: data.indexerUrl,
          indexerApiKey: data.indexerApiKey,
        })
        .where(eq(indexerManager.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(indexerManager).values(data).returning();
    return created;
  }

  async delete(): Promise<void> {
    await db.delete(indexerManager);
  }
}
