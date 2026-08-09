import { hasMinRole, type UserRole } from "@seedarr/contracts";

import { useAuth } from "../auth-store";

export function useRole() {
  const user = useAuth((state) => state.user);

  const hasRole = (minRole: UserRole): boolean => hasMinRole(user?.role, minRole);

  return {
    role: user?.role,
    isOwner: user?.role === "owner",
    isAdmin: user?.role === "admin" || user?.role === "owner",
    isMember: user?.role === "member",
    isViewer: user?.role === "viewer",
    hasRole,
  };
}
