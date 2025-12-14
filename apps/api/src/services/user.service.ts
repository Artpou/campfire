import { db, eq } from "@/db/db";
import { NewUser, User, users } from "@/db/schema";

export class UserService {
  async getById(id: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    return user ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    return user ?? null;
  }

  async getAll(): Promise<User[]> {
    return await db.query.users.findMany();
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async update(id: string, data: Partial<Omit<NewUser, "id" | "createdAt">>): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const [deleted] = await db.delete(users).where(eq(users.id, id)).returning();
    return deleted !== undefined;
  }
}

export const userService = new UserService();
