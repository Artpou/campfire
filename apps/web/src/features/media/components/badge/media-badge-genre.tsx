import type { ComponentProps } from "react";

import { Badge } from "@/shared/ui/badge";

type BadgeProps = ComponentProps<typeof Badge>;

type GenreLike = string | { id?: number; name?: string | null };

interface MediaBadgeGenreProps extends Omit<BadgeProps, "children"> {
  genre?: GenreLike | null;
}

function genreLabel(genre: GenreLike): string | null {
  if (typeof genre === "string") return genre || null;
  return genre.name || null;
}

export function MediaBadgeGenre({ genre, variant = "outline", className, ...props }: MediaBadgeGenreProps) {
  const label = genre ? genreLabel(genre) : null;
  if (!label) return null;

  return (
    <Badge variant={variant} className={className} {...props}>
      {label}
    </Badge>
  );
}
