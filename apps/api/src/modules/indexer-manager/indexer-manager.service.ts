import { CreateIndexerManager } from "@basement/validators/indexerManager.validators";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { IndexerType, indexerManager, type NewIndexerManager } from "@/db/schema";
import { AuthenticatedService } from "../../classes/authenticated-service";

export class IndexerManagerService extends AuthenticatedService {
  private query = db.select().from(indexerManager);

  async list() {
    return await this.query.where(eq(indexerManager.userId, this.user.id));
  }

  async getSelected() {
    const [result] = await this.query
      .where(and(eq(indexerManager.userId, this.user.id), eq(indexerManager.selected, true)))
      .limit(1);
    return result ?? null;
  }

  async getById(id: string) {
    const [result] = await this.query.where(eq(indexerManager.id, id)).limit(1);
    return result ?? null;
  }

  async getByName(name: IndexerType) {
    const [result] = await this.query
      .where(and(eq(indexerManager.name, name), eq(indexerManager.userId, this.user.id)))
      .limit(1);
    return result ?? null;
  }

  async create(data: Omit<NewIndexerManager, "id">) {
    const [result] = await db.insert(indexerManager).values(data).returning();
    return result;
  }

  async select(id: string) {
    await db
      .update(indexerManager)
      .set({ selected: false })
      .where(eq(indexerManager.userId, this.user.id));
    await db.update(indexerManager).set({ selected: true }).where(eq(indexerManager.id, id));
  }

  async update(id: string, data: Partial<Omit<NewIndexerManager, "id" | "userId">>) {
    await db.update(indexerManager).set(data).where(eq(indexerManager.id, id));
    await this.select(id);
    return await this.getById(id);
  }

  async delete(id: string) {
    await db.delete(indexerManager).where(eq(indexerManager.id, id));
  }

  async upsert(data: CreateIndexerManager) {
    const updateData = Object.fromEntries(
      Object.entries({
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        selected: data.selected,
      }).filter(([_, value]) => value !== undefined),
    );

    const [result] = await db
      .insert(indexerManager)
      .values({ ...data, userId: this.user.id })
      .onConflictDoUpdate({
        target: [indexerManager.userId, indexerManager.name],
        set: updateData,
      })
      .returning();

    await this.select(result.id);
    return result;
  }
}
