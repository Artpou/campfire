import { count, eq } from "drizzle-orm";

import { ConflictError, ForbiddenError, NotFoundError } from "@/shared/errors/error";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { hashPassword } from "@/auth/password.util";
import { db } from "@/db/db";
import { user } from "@/modules/user/user.schema";
import type { CreateUserInput, NewUser, UpdateUserInput, User } from "./user.dto";

const userColumns = {
  id: true,
  username: true,
  role: true,
  createdAt: true,
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes("unique constraint") || message.includes("sqlite_constraint_unique")) {
    return true;
  }
  return isUniqueConstraintError(error.cause);
}

export class UserService extends IdentifiableService<User> {
  constructor(user?: User) {
    // userService can be instantiated without a user
    super(user as User);
  }

  async getMany(): Promise<User[]> {
    return db.query.user.findMany({ columns: userColumns });
  }

  async get(id: string): Promise<User> {
    const result = await db.query.user.findFirst({ where: eq(user.id, id), columns: userColumns });
    if (!result) throw new NotFoundError("User");
    return result;
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
    const existingOwner = await db.query.user.findFirst({
      where: eq(user.role, "owner"),
      columns: { id: true },
    });
    if (existingOwner) {
      throw new ForbiddenError("Registration is closed. Contact an administrator.");
    }

    const existing = await db.query.user.findFirst({
      where: eq(user.username, username),
      columns: { id: true },
    });
    if (existing) throw new ConflictError("Username already exists");

    try {
      const [created] = await db.insert(user).values({ username, password: hashedPassword, role: "owner" }).returning({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      });

      if (!created) throw new ConflictError("Failed to create user");
      return created;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenError("Registration is closed. Contact an administrator.");
      }
      throw error;
    }
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
    return this.get(id);
  }

  async delete(caller: User, id: string): Promise<{ success: true }> {
    const target = await this.get(id);

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
