import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { UserRole } from "@seedarr/contracts";
import { CrownIcon, GlassesIcon, ShieldCheckIcon, UserCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";

const roleConfig: Record<
  UserRole,
  {
    icon: typeof CrownIcon;
    color: string;
    bgColor: string;
  }
> = {
  owner: {
    icon: CrownIcon,
    color: "var(--red)",
    bgColor: "oklch(from var(--red) l c h / 0.1)",
  },
  admin: {
    icon: ShieldCheckIcon,
    color: "var(--purple)",
    bgColor: "oklch(from var(--purple) l c h / 0.1)",
  },
  member: {
    icon: UserCheckIcon,
    color: "var(--primary)",
    bgColor: "oklch(from var(--primary) l c h / 0.1)",
  },
  viewer: {
    icon: GlassesIcon,
    color: "var(--blue)",
    bgColor: "oklch(from var(--blue) l c h / 0.1)",
  },
};

export const ROLE_LABELS: Record<UserRole, ReturnType<typeof msg>> = {
  owner: msg`Owner`,
  admin: msg`Admin`,
  member: msg`Member`,
  viewer: msg`Viewer`,
};

export { roleConfig };

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const { t } = useLingui();
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1.5", className)}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      <RoleIcon className="size-3.5" />
      {t(ROLE_LABELS[role])}
    </Badge>
  );
}
