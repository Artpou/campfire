import type { UserRole } from "@seedarr/contracts";

const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function hasMinRole(role: UserRole | undefined, minRole: UserRole): boolean {
  if (!role) return false;
  return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole];
}
