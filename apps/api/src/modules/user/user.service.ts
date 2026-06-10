import { count, eq } from "drizzle-orm";

import { hashPassword } from "@/auth/password.util";
import { db } from "@/db/db";
import { ConflictError, ForbiddenError, NotFoundError } from "@/errors/error";
import { IdentifiableService } from "@/modules/auth/auth.service";
import { user } from "@/modules/user/user.schema";
import type { CreateUserInput, NewUser, UpdateUserInput, User } from "./user.dto";

const userColumns = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
} as const;

export class UserService extends IdentifiableService<User> {
  constructor(user?: User) {
    super(user as User);
  }

  async getMany(): Promise<User[]> {
    return db.query.user.findMany({ columns: userColumns });
  }

  async get(id: string): Promise<User | undefined> {
    return db.query.user.findFirst({ where: eq(user.id, id), columns: userColumns });
  }

  async getByUsername(username: string): Promise<User | undefined> {
    return db.query.user.findFirst({ where: eq(user.username, username), columns: userColumns });
  }

  async getFullUser(username: string) {
    return db.query.user.findFirst({ where: eq(user.username, username) });
  }

  async count(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(user);
    return result?.count ?? 0;
  }

  async hasOwner(): Promise<boolean> {
    const result = await db.query.user.findFirst({
      where: eq(user.role, "owner"),
      columns: { id: true },
    });
    return !!result;
  }

  async register(username: string, hashedPassword: string): Promise<User> {
    const existing = await this.getByUsername(username);
    if (existing) throw new ConflictError("Username already exists");

    await db.insert(user).values({ username, password: hashedPassword, role: "owner" });

    const created = await this.getByUsername(username);
    if (!created) throw new ConflictError("Failed to create user");
    return created;
  }

  async create(caller: User, input: CreateUserInput): Promise<User> {
    if (caller.role === "admin" && (input.role === "owner" || input.role === "admin")) {
      throw new ForbiddenError("Admin can only create member or viewer roles");
    }

    const existing = await this.getByUsername(input.username);
    if (existing) throw new ConflictError("Username already exists");

    await db.insert(user).values({
      username: input.username,
      password: hashPassword(input.password),
      role: input.role,
    });

    const created = await this.getByUsername(input.username);
    if (!created) throw new ConflictError("Failed to create user");
    return created;
  }

  async update(caller: User, id: string, input: UpdateUserInput): Promise<User> {
    const target = await this.get(id);
    if (!target) throw new NotFoundError("User");

    if (target.role === "owner") {
      throw new ForbiddenError("Cannot modify owner account");
    }
    if (caller.role === "admin" && target.role === "admin") {
      throw new ForbiddenError("Admin cannot modify other admin accounts");
    }
    if (caller.role === "admin" && input.role && (input.role === "owner" || input.role === "admin")) {
      throw new ForbiddenError("Admin can only set member or viewer roles");
    }

    const data: Partial<Omit<NewUser, "id" | "createdAt">> = {};
    if (input.username) data.username = input.username;
    if (input.password) data.password = hashPassword(input.password);
    if (input.role) data.role = input.role;

    await db.update(user).set(data).where(eq(user.id, id));
    const updated = await this.get(id);
    if (!updated) throw new NotFoundError("User");
    return updated;
  }

  async delete(caller: User, id: string): Promise<{ success: true }> {
    const target = await this.get(id);
    if (!target) throw new NotFoundError("User");

    if (target.role === "owner") {
      throw new ForbiddenError("Cannot delete owner account");
    }
    if (caller.role === "admin" && target.role === "admin") {
      throw new ForbiddenError("Admin cannot delete other admin accounts");
    }

    await db.delete(user).where(eq(user.id, id));
    return { success: true };
  }
}
