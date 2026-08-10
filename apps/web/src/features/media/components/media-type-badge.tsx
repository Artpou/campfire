import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { FilmIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";

interface MediaTypeBadgeProps {
  type: Media["type"];
  className?: string;
}

export function MediaTypeBadge({ type, className }: MediaTypeBadgeProps) {
  const isTv = type === "tv";

  return (
    <Badge variant="glass" className={cn(className)}>
      {isTv ? <TvIcon /> : <FilmIcon />}
      <Trans>{isTv ? "TV" : "Movie"}</Trans>
    </Badge>
  );
}
