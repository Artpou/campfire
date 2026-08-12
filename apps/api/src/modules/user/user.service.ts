import type {
  ChangePasswordInput,
  CreateUserInput,
  UpdateProfileInput,
  UpdateUserInput,
  UserStats,
} from "@seedarr/contracts";
import { count, eq } from "drizzle-orm";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/errors/error";
import { getAvatarsRoot, resolveWithinAvatars } from "@/shared/helpers/path.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { hashPassword, verifyPassword } from "@/auth/password.util";
import { invalidateSessionsForUser } from "@/auth/session.util";
import { db } from "@/db/db";
import { importLetterboxdZip } from "@/modules/media/letterboxd/letterboxd-import.service";
import { syncLetterboxdDiary } from "@/modules/media/letterboxd/letterboxd-sync.service";
import { type NewUser, type User, user } from "@/modules/user/user.schema";
import { getUserStats } from "@/modules/user/user-stats.query";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const userColumns = {
  id: true,
  username: true,
  pseudo: true,
  avatarPath: true,
  role: true,
  letterboxdUsername: true,
  createdAt: true,
} as const;

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  async getFullUserById(id: string) {
    return db.query.user.findFirst({ where: eq(user.id, id) });
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
        pseudo: user.pseudo,
        avatarPath: user.avatarPath,
        role: user.role,
        letterboxdUsername: user.letterboxdUsername,
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
    if (input.role || input.password) invalidateSessionsForUser(id);
    return this.get(id);
  }

  async updateProfile(input: UpdateProfileInput): Promise<User> {
    const data: Partial<{
      pseudo: string | null;
      letterboxdUsername: string | null;
    }> = {};

    if (input.pseudo !== undefined) data.pseudo = input.pseudo;
    if (input.letterboxdUsername !== undefined) {
      data.letterboxdUsername = input.letterboxdUsername ? input.letterboxdUsername.trim().toLowerCase() : null;
    }

    if (Object.keys(data).length > 0) {
      await db.update(user).set(data).where(eq(user.id, this.user.id));
    }
    return this.get(this.user.id);
  }

  async changePassword(input: ChangePasswordInput): Promise<{ success: true }> {
    const fullUser = await this.getFullUserById(this.user.id);
    if (!fullUser) throw new NotFoundError("User");

    if (!verifyPassword(input.oldPassword, fullUser.password)) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    await db
      .update(user)
      .set({ password: hashPassword(input.newPassword) })
      .where(eq(user.id, this.user.id));
    invalidateSessionsForUser(this.user.id);
    return { success: true };
  }

  async uploadAvatar(file: File): Promise<User> {
    if (!AVATAR_MIME_TO_EXT[file.type]) {
      throw new BadRequestError("Invalid image type. Allowed: JPEG, PNG, WebP, GIF");
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new BadRequestError("Image too large. Maximum size is 2MB");
    }

    const ext = AVATAR_MIME_TO_EXT[file.type];
    const relativePath = `${this.user.id}.${ext}`;
    const absolutePath = resolveWithinAvatars(relativePath);

    await mkdir(getAvatarsRoot(), { recursive: true });

    const current = await this.get(this.user.id);
    if (current.avatarPath && current.avatarPath !== relativePath) {
      try {
        await unlink(resolveWithinAvatars(current.avatarPath));
      } catch {
        // previous file may already be gone
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    await db.update(user).set({ avatarPath: relativePath }).where(eq(user.id, this.user.id));
    return this.get(this.user.id);
  }

  async resolveAvatarFile(userId: string): Promise<{ absolutePath: string; contentType: string } | null> {
    const target = await this.get(userId);
    if (!target.avatarPath) return null;

    const absolutePath = resolveWithinAvatars(target.avatarPath);
    const ext = path.extname(target.avatarPath).slice(1).toLowerCase();
    const contentType =
      Object.entries(AVATAR_MIME_TO_EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";

    return { absolutePath, contentType };
  }

  async delete(caller: User, id: string): Promise<{ success: true }> {
    const target = await this.get(id);

    if (target.role === "owner") {
      throw new ForbiddenError("Cannot delete owner account");
    }
    if (caller.role === "admin" && target.role === "admin") {
      throw new ForbiddenError("Admin cannot delete other admin accounts");
    }

    if (target.avatarPath) {
      try {
        await unlink(resolveWithinAvatars(target.avatarPath));
      } catch {
        // ignore missing avatar file
      }
    }

    await db.delete(user).where(eq(user.id, id));
    invalidateSessionsForUser(id);
    return { success: true };
  }

  async getStats(userId: string): Promise<UserStats> {
    return getUserStats(userId);
  }

  async importLetterboxd(file: File) {
    return importLetterboxdZip(this.user.id, file);
  }

  async syncLetterboxd() {
    return syncLetterboxdDiary(this.user.id);
  }
}
