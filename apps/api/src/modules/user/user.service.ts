import type {
  ChangePasswordInput,
  CreateUserInput,
  ListUsersQuery,
  UpdateProfileInput,
  UpdateUserInput,
  UserStats,
} from "@seedarr/contracts";

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { paginate, toPaginate } from "@/shared/helpers/pagination.helper";
import type { Paginate } from "@/shared/helpers/pagination.types";
import { getAvatarsRoot, resolveWithinAvatars } from "@/shared/helpers/path.helper";
import { IdentifiableService } from "@/shared/services/authenticated.service";

import { hashPassword, verifyPassword } from "@/auth/password.util";
import { invalidateSessionsForUser } from "@/auth/session.util";
import { importLetterboxdZip } from "@/modules/media/letterboxd/letterboxd-import.service";
import { syncLetterboxdDiary } from "@/modules/media/letterboxd/letterboxd-sync.service";
import { userRepository } from "@/modules/user/user.repository";
import type { NewUser, User } from "@/modules/user/user.schema";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

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
    super(user as User);
  }

  async getMany(_args?: { ids?: string[] }): Promise<User[]> {
    return userRepository.list();
  }

  async search(q?: string): Promise<User[]> {
    const term = q?.trim();
    if (!term) return this.getMany();
    return userRepository.search(term);
  }

  async searchPaginated(query: ListUsersQuery): Promise<Paginate<User>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const paginationOpts = paginate({ page, limit });
    const [rows, total] = await Promise.all([
      userRepository.searchPage({ q: query.q, ...paginationOpts }),
      userRepository.searchCount(query.q),
    ]);
    return toPaginate(rows, { page, limit }, total);
  }

  async get(id: string): Promise<User> {
    return userRepository.get(id);
  }

  async getByUsername(username: string): Promise<User | undefined> {
    return userRepository.findByUsername(username);
  }

  async getFullUser(username: string) {
    return userRepository.findFullByUsername(username);
  }

  async getFullUserById(id: string) {
    return userRepository.findFullById(id);
  }

  async count(): Promise<number> {
    return userRepository.count();
  }

  async hasOwner(): Promise<boolean> {
    return userRepository.hasOwner();
  }

  async register(username: string, hashedPassword: string): Promise<User> {
    if (await userRepository.hasOwner()) {
      throw new ForbiddenError("Registration is closed. Contact an administrator.");
    }
    if (await userRepository.usernameExists(username)) {
      throw new ConflictError("Username already exists");
    }

    try {
      const user = await userRepository.insertOwner(username, hashedPassword);
      logger.info("AUTH", `Registered owner user "${username}"`);
      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ForbiddenError("Registration is closed. Contact an administrator.");
      }
      throw error;
    }
  }

  async verifyLogin(username: string, password: string): Promise<string> {
    const existingUser = await this.getFullUser(username);
    if (!existingUser || !verifyPassword(password, existingUser.password)) {
      throw new UnauthorizedError("Invalid username or password");
    }
    logger.info("AUTH", `Logged in "${username}"`);
    return existingUser.id;
  }

  async create(caller: User, input: CreateUserInput): Promise<User> {
    if (caller.role === "admin" && (input.role === "owner" || input.role === "admin")) {
      throw new ForbiddenError("Admin can only create member or viewer roles");
    }

    if (await userRepository.usernameExists(input.username)) {
      throw new ConflictError("Username already exists");
    }

    await userRepository.insert({
      username: input.username,
      password: hashPassword(input.password),
      role: input.role,
    });

    const created = await userRepository.findByUsername(input.username);
    if (!created) throw new ConflictError("Failed to create user");
    logger.info("USER", `Created user "${created.username}" (${created.role})`);
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

    await userRepository.update(id, data);
    if (input.role || input.password) invalidateSessionsForUser(id);
    const updated = await this.get(id);
    logger.info("USER", `Updated user "${updated.username}"`);
    return updated;
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
      await userRepository.update(this.user.id, data);
    }
    return this.get(this.user.id);
  }

  async completeOnboarding(): Promise<User> {
    await userRepository.update(this.user.id, { onboarded: true });
    invalidateSessionsForUser(this.user.id);
    return this.get(this.user.id);
  }

  async changePassword(input: ChangePasswordInput): Promise<{ success: true }> {
    const fullUser = await userRepository.findFullById(this.user.id);
    if (!fullUser) throw new NotFoundError("User");

    if (!verifyPassword(input.oldPassword, fullUser.password)) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    await userRepository.update(this.user.id, { password: hashPassword(input.newPassword) });
    invalidateSessionsForUser(this.user.id);
    logger.info("USER", `Password changed for "${this.user.username}"`);
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

    await userRepository.update(this.user.id, { avatarPath: relativePath });
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

    await userRepository.delete(id);
    invalidateSessionsForUser(id);
    logger.info("USER", `Deleted user "${target.username}"`);
    return { success: true };
  }

  async getStats(userId: string): Promise<UserStats> {
    return userRepository.getStats(userId);
  }

  async importLetterboxd(file: File) {
    logger.info("LETTERBOXD", `ZIP import started for user ${this.user.username}`);
    return importLetterboxdZip(this.user.id, file);
  }

  async syncLetterboxd() {
    logger.info("LETTERBOXD", `RSS sync started for user ${this.user.username}`);
    return syncLetterboxdDiary(this.user.id);
  }
}
