import { count, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { type NewUser, user } from "@/db/schema";

export class UserService {
  private query = db
    .select({ id: user.id, username: user.username, role: user.role, createdAt: user.createdAt })
    .from(user);

  async getById(id: string) {
    const [result] = await this.query.where(eq(user.id, id)).limit(1);
    return result ?? null;
  }

  async getByUsername(username: string) {
    const [result] = await this.query.where(eq(user.username, username)).limit(1);
    return result ?? null;
  }

  async count() {
    const [result] = await db.select({ count: count() }).from(user);
    return result?.count ?? 0;
  }

  async hasOwner() {
    const [result] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, "owner"))
      .limit(1);
    return !!result;
  }

  async list() {
    return await this.query;
  }

  async getFullUser(username: string) {
    const [result] = await db.select().from(user).where(eq(user.username, username)).limit(1);
    return result ?? null;
  }

  async create(data: Omit<NewUser, "id" | "createdAt">) {
    await db.insert(user).values(data);
    return this.getByUsername(data.username);
  }

  async update(id: string, data: Partial<Omit<NewUser, "id" | "createdAt">>) {
    await db.update(user).set(data).where(eq(user.id, id));
    return this.getById(id);
  }

  async delete(id: string) {
    await db.delete(user).where(eq(user.id, id));
  }
}

export const userService = new UserService();
