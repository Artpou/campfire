import { StarIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";

interface MediaRatingProps {
  media: { vote_average?: number | null | undefined };
  className?: string;
}

export function MediaRating({ media, className }: MediaRatingProps) {
  if (media.vote_average == null || media.vote_average <= 0) return null;

  const score = media.vote_average / 2;

  return (
    <Badge variant="glass" className={className}>
      <StarIcon className="fill-primary text-primary shrink-0" />
      <span className="text-sm font-semibold tabular-nums leading-none tracking-tight">{score.toFixed(1)}</span>
    </Badge>
  );
}
