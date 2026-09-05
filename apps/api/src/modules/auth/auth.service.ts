import { moduleRepository } from "@/modules/module/module.repository";
import type { User } from "@/modules/user/user.schema";
import type { AuthUser } from "./auth.types";

/** Session user payload for GET /auth/me. */
export async function getSessionUser(user: User): Promise<AuthUser> {
  const countIndexerManagers = (await moduleRepository.listByCategory("indexer")).length;
  return { ...user, countIndexerManagers };
}
