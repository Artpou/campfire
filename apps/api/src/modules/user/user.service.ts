import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { type NewUser, type User, user } from "@/db/schema";

export class UserService {
  private query = db.select().from(user);

  async getById(id: string): Promise<User | null> {
    const result = await this.query.where(eq(user.id, id)).limit(1);
    return result[0] ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const result = await this.query.where(eq(user.email, email)).limit(1);
    return result[0] ?? null;
  }

  async getAll(): Promise<User[]> {
    return await this.query;
  }

  async update(id: string, data: Partial<Omit<NewUser, "id" | "createdAt">>): Promise<User | null> {
    await db
      .update(user)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id));
    return await this.getById(id);
  }

  async delete(id: string): Promise<void> {
    await db.delete(user).where(eq(user.id, id));
  }
}

export const userService = new UserService();
