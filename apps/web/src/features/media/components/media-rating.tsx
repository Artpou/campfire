import { CheckIcon, StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";

import { isMediaWatched } from "@/features/media/helpers/media.helper";

interface MediaRatingProps {
  media: {
    vote_average?: number | null | undefined;
    userScore?: number | null | undefined;
    progress?: {
      position: number;
      duration: number;
      completed?: boolean;
    } | null;
  };
  className?: string;
}

/** TMDB average (/5) + optional user score (/5), or green check when watched without rating. */
export function MediaRating({ media, className }: MediaRatingProps) {
  if (media.vote_average == null || media.vote_average <= 0) return null;

  const tmdbScore = media.vote_average / 2;
  const userScore = media.userScore != null && media.userScore > 0 ? media.userScore / 2 : null;
  const showWatchedCheck = userScore == null && isMediaWatched(media);

  return (
    <div className="flex gap-1">
      <Badge variant="glass" className={cn(className)}>
        <StarIcon className="fill-white text-transparent shrink-0" />
        <span className="text-sm font-semibold tabular-nums leading-none tracking-tight">{tmdbScore.toFixed(1)}</span>
        {userScore != null && (
          <>
            <Separator className="h-3 w-px bg-white" orientation="vertical" />
            <StarIcon className="fill-primary text-transparent shrink-0" />
            <span className="text-sm text-primary font-semibold tabular-nums leading-none tracking-tight">
              {userScore.toFixed(1)}
            </span>
          </>
        )}
        {showWatchedCheck && (
          <>
            <Separator className="h-3 w-px bg-white" orientation="vertical" />
            <CheckIcon className="size-3.5 text-emerald-400 shrink-0" />
          </>
        )}
      </Badge>
    </div>
  );
}
