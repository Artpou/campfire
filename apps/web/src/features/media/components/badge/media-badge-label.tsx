import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@/shared/ui/badge";

type BadgeProps = ComponentProps<typeof Badge>;

interface MediaBadgeLabelProps extends Omit<BadgeProps, "children"> {
  children?: ReactNode;
  /** When false/null/undefined, render nothing. */
  show?: boolean | null;
}

/** Generic labeled badge that no-ops when `show` is falsey (unless children alone is enough). */
export function MediaBadgeLabel({
  show = true,
  children,
  variant = "outline",
  className,
  ...props
}: MediaBadgeLabelProps) {
  if (!show || children == null || children === false) return null;

  return (
    <Badge variant={variant} className={className} {...props}>
      {children}
    </Badge>
  );
}
