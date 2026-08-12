import type { User } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

import { UserAvatar } from "@/features/user/components/user-avatar";

interface UserProfileProps {
  user: Pick<User, "id" | "username" | "pseudo"> & { avatarPath?: string | null; role?: string };
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function UserProfile({ user, size = "md", className }: UserProfileProps) {
  const displayName = user.pseudo || user.username;
  const avatarUser = { ...user, avatarPath: user.avatarPath ?? null };

  return (
    <Link to="/user/$id" params={{ id: user.id }} className={cn("hover:opacity-80 transition-opacity", className)}>
      <div className={cn("flex items-center gap-2", size === "xs" && "gap-1.5", className)}>
        <UserAvatar user={avatarUser} size={size === "md" ? "sm" : "xs"} />
        <span
          className={cn(
            "font-medium truncate",
            size === "xs" && "text-xs",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
          )}
        >
          {displayName}
        </span>
      </div>{" "}
    </Link>
  );
}
