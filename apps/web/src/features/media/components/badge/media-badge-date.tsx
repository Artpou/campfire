import { CalendarIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/shared/ui/badge";

interface MediaBadgeDateProps extends Omit<BadgeProps, "children"> {
  date?: string | null;
  /** Show year only instead of full locale date. */
  yearOnly?: boolean;
}

export function MediaBadgeDate({
  date,
  yearOnly = false,
  variant = "glass",
  className,
  ...props
}: MediaBadgeDateProps) {
  if (!date) return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  const label = yearOnly
    ? String(parsed.getFullYear())
    : parsed.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  return (
    <Badge variant={variant} className={className} {...props}>
      {!yearOnly && <CalendarIcon />}
      {label}
    </Badge>
  );
}
