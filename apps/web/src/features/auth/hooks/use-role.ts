import { useAuth } from "../auth-store";

type UserRole = "owner" | "admin" | "member" | "viewer";

const roleHierarchy: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function useRole() {
  const user = useAuth((state) => state.user);

  const hasRole = (minRole: UserRole): boolean => {
    if (!user) return false;
    return roleHierarchy[user.role] >= roleHierarchy[minRole];
  };

  return {
    role: user?.role,
    isOwner: user?.role === "owner",
    isAdmin: user?.role === "admin" || user?.role === "owner",
    isMember: user?.role === "member",
    isViewer: user?.role === "viewer",
    hasRole,
  };
}
