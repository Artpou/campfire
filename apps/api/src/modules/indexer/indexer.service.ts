import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { Indexer, indexer, type NewIndexer } from "@/db/schema";

export class IndexerService {
  private query = db.select().from(indexer);

  async getUserIndexers(userId: string): Promise<Indexer[]> {
    return await this.query.where(eq(indexer.userId, userId));
  }

  async getById(id: string) {
    const result = await this.query.where(eq(indexer.id, id)).limit(1);
    return result[0] || null;
  }

  async getByName(name: string, userId: string) {
    const result = await this.query
      .where(and(eq(indexer.name, name), eq(indexer.userId, userId)))
      .limit(1);
    return result[0] || null;
  }

  async create(data: Omit<NewIndexer, "id">) {
    const [result] = await db.insert(indexer).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<Omit<NewIndexer, "id" | "userId">>) {
    await db.update(indexer).set(data).where(eq(indexer.id, id));
    return await this.getById(id);
  }

  async delete(id: string) {
    await db.delete(indexer).where(eq(indexer.id, id));
  }

  async upsert(data: Omit<NewIndexer, "id">) {
    const [result] = await db
      .insert(indexer)
      .values(data)
      .onConflictDoUpdate({
        target: [indexer.userId, indexer.name],
        set: {
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
        },
      })
      .returning();
    return result;
  }
}

export const indexerService = new IndexerService();
