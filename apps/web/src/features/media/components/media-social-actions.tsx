import { t } from "@lingui/core/macro";
import type { Media } from "@seedarr/sdk";
import { ClockPlusIcon, HeartIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";

interface MediaSocialActionsProps {
  media: Media;
  className?: string;
}

export function MediaSocialActions({ media, className }: MediaSocialActionsProps) {
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  return (
    <div className={cn("flex gap-3", className)}>
      <Button
        size="icon-lg"
        variant={media.liked ? "default" : "outline"}
        rounded
        onClick={() => toggleLike.mutate(media)}
        aria-label={t`Like`}
      >
        <HeartIcon className={cn(media.liked && "fill-white")} />
      </Button>
      <Button
        size="icon-lg"
        variant={media.inWatchList ? "default" : "outline"}
        rounded
        onClick={() => toggleWatchList.mutate(media)}
        aria-label={t`Watchlist`}
      >
        <ClockPlusIcon className={cn(media.inWatchList && "text-white")} />
      </Button>
    </div>
  );
}
