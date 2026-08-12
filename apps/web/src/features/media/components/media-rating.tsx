import type { Media } from "@seedarr/sdk";
import { CheckIcon, StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";

import { isMediaWatched } from "@/features/media/helpers/media.helper";

interface MediaRatingProps {
  media: Media;
  className?: string;
  onlyOne?: boolean;
}

const parseScore = (score?: number | null) => (score && score > 0 ? score / 2 : null);

export function MediaRating({ media, className, onlyOne = false }: MediaRatingProps) {
  const userScore = parseScore(media.userScore);
  const tmdbScore = parseScore(media.vote_average);
  const isWatched = isMediaWatched(media);

  if (!userScore && !tmdbScore) return null;

  if (onlyOne) {
    const activeScore = userScore ?? tmdbScore;
    if (!activeScore) return null;

    return (
      <Badge variant="glass" className={className}>
        <RatingItem score={activeScore} primary={userScore != null} />
        {userScore == null && isWatched && <WatchedCheck />}
      </Badge>
    );
  }

  return (
    <Badge variant="glass" className={className}>
      {tmdbScore && <RatingItem score={tmdbScore} />}
      {tmdbScore && userScore && <Divider />}
      {userScore && <RatingItem score={userScore} primary />}
      {userScore == null && isWatched && <WatchedCheck />}
    </Badge>
  );
}

function RatingItem({ score, primary }: { score: number; primary?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <StarIcon className={cn("size-3.5 shrink-0 fill-current", primary ? "text-primary" : "text-white")} />
      <span
        className={cn(
          "text-sm font-semibold tabular-nums leading-none tracking-tight",
          primary ? "text-primary" : "text-white",
        )}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function Divider() {
  return <Separator orientation="vertical" className="h-3 w-px bg-white/20" />;
}

function WatchedCheck() {
  return (
    <>
      <Divider />
      <CheckIcon className="size-3.5 shrink-0 text-emerald-400" />
    </>
  );
}
