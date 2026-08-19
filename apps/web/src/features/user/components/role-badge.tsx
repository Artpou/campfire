import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { UserRole } from "@seedarr/contracts";
import { CrownIcon, GlassesIcon, ShieldCheckIcon, UserCheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge, type BadgeProps } from "@/shared/ui/badge";

const roleConfig: Record<
  UserRole,
  {
    icon: typeof CrownIcon;
    variant: NonNullable<BadgeProps["variant"]>;
    iconClass: string;
  }
> = {
  owner: { icon: CrownIcon, variant: "red-outline", iconClass: "text-red" },
  admin: { icon: ShieldCheckIcon, variant: "purple-outline", iconClass: "text-purple" },
  member: { icon: UserCheckIcon, variant: "primary-outline", iconClass: "text-primary" },
  viewer: { icon: GlassesIcon, variant: "blue-outline", iconClass: "text-blue" },
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
    <Badge variant={config.variant} className={cn("gap-1.5", className)}>
      <RoleIcon className="size-3.5" />
      {t(ROLE_LABELS[role])}
    </Badge>
  );
}
