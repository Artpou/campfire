import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { FilmIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";

interface MediaTypeBadgeProps {
  type: Media["type"];
  className?: string;
  /** Icon only — used on media cards. */
  iconOnly?: boolean;
}

export function MediaBadgeType({ type, className, iconOnly = false }: MediaTypeBadgeProps) {
  const isTv = type === "tv";
  const Icon = isTv ? TvIcon : FilmIcon;

  return (
    <Badge variant="glass" className={cn(iconOnly && "px-1.5", className)}>
      <Icon />
      {!iconOnly && <Trans>{isTv ? "TV" : "Movie"}</Trans>}
    </Badge>
  );
}
